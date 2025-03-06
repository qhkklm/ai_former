document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const modelTypeRadios = document.querySelectorAll('input[name="model-type"]');
    const ollamaConfig = document.getElementById('ollama-config');
    const qianwenConfig = document.getElementById('qianwen-config');
    const ollamaModelSelect = document.getElementById('ollama-model');
    const customModelContainer = document.getElementById('custom-model-container');
    const fillFormButton = document.getElementById('fill-form');
    const extractFormButton = document.getElementById('extract-form');
    const removeHighlightsButton = document.getElementById('remove-highlights');
    const statusDiv = document.getElementById('status');
    const ollamaUrlInput = document.getElementById('ollama-url');
    const userPromptTextarea = document.getElementById('user-prompt');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // 添加一个变量来跟踪AI请求状态
    let isAIRequestInProgress = false;
    let aiRequestTimeoutId = null;
    let isHighlightBeingRemoved = false; // 添加标志位，跟踪是否正在移除高亮
    let isRefreshPromptShown = false; // 添加标志位，避免重复显示刷新提示

    // 通用错误处理函数，处理"Receiving end does not exist"错误
    function handleConnectionError(error, tabId, callback) {
        console.error('连接错误:', error);
        
        // 检查是否是"Receiving end does not exist"错误
        if (error && error.message && error.message.includes("Receiving end does not exist")) {
            // 避免重复显示刷新提示
            if (!isRefreshPromptShown) {
                isRefreshPromptShown = true;
                
                // 显示错误提示，并提供刷新按钮
                showToastInPage('无法连接到页面，请刷新页面或重新打开侧边栏', 'error', 10000);
                
                // 创建刷新按钮
                const refreshButton = document.createElement('button');
                refreshButton.textContent = '刷新页面';
                refreshButton.style.marginTop = '10px';
                refreshButton.style.backgroundColor = '#4285f4';
                refreshButton.style.color = 'white';
                refreshButton.style.border = 'none';
                refreshButton.style.padding = '7px 12px';
                refreshButton.style.borderRadius = '4px';
                refreshButton.style.cursor = 'pointer';
                
                // 添加点击事件
                refreshButton.addEventListener('click', function() {
                    // 刷新当前标签页
                    chrome.tabs.reload(tabId, {}, function() {
                        showToastInPage('页面已刷新，请稍等片刻再试', 'info');
                        setTimeout(() => {
                            isRefreshPromptShown = false;
                        }, 3000);
                    });
                });
                
                // 添加到状态区域
                statusDiv.appendChild(document.createElement('br'));
                statusDiv.appendChild(refreshButton);
                
                // 尝试自动注入内容脚本
                try {
                    chrome.scripting.executeScript({
                        target: {tabId: tabId},
                        files: ['content.js']
                    }).then(() => {
                        console.log('已尝试重新注入内容脚本');
                        if (callback) callback();
                    }).catch(err => {
                        console.error('注入脚本失败:', err);
                    });
                } catch (err) {
                    console.error('尝试注入脚本时出错:', err);
                }
            }
            return true; // 表示已处理错误
        }
        return false; // 表示未处理错误
    }

    // 加载保存的配置
    loadSavedConfig();

    // 切换模型类型时的事件处理
    modelTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'ollama') {
                ollamaConfig.classList.remove('hidden');
                qianwenConfig.classList.add('hidden');
                // 当切换到Ollama时，尝试获取模型列表
                fetchOllamaModels();
            } else if (this.value === 'qianwen') {
                ollamaConfig.classList.add('hidden');
                qianwenConfig.classList.remove('hidden');
            }
            saveConfig();
        });
    });

    // Ollama URL变化时，重新获取模型列表
    ollamaUrlInput.addEventListener('change', function() {
        fetchOllamaModels();
    });

    // Ollama模型选择变化时的事件处理
    ollamaModelSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customModelContainer.classList.remove('hidden');
        } else {
            customModelContainer.classList.add('hidden');
        }
        saveConfig();
    });

    // 配置字段变化时保存配置
    document.querySelectorAll('input[type="text"], select').forEach(element => {
        element.addEventListener('change', saveConfig);
    });

    // 为用户输入框添加快捷键（Ctrl + Enter）
    userPromptTextarea.addEventListener('keydown', function(e) {
        // 检查是否按下了Ctrl+Enter
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault(); // 阻止默认行为
            
            // 如果AI请求正在进行中，则不执行操作
            if (isAIRequestInProgress) {
                showToastInPage('请等待当前请求完成', 'warning');
                return;
            }
            
            fillFormButton.click(); // 触发填充按钮的点击事件
            showToastInPage('使用快捷键 Ctrl+Enter 触发填充', 'info', 1500);
        }
    });

    // 设置按钮状态的函数
    function setButtonsState(disabled) {
        fillFormButton.disabled = disabled;
        extractFormButton.disabled = disabled;
        removeHighlightsButton.disabled = disabled;
        
        // 更新加载指示器
        if (disabled) {
            loadingIndicator.classList.add('active');
        } else {
            loadingIndicator.classList.remove('active');
        }
    }
    
    // 开始AI请求
    function startAIRequest() {
        isAIRequestInProgress = true;
        setButtonsState(true);
        
        // 设置1分钟超时
        aiRequestTimeoutId = setTimeout(() => {
            if (isAIRequestInProgress) {
                endAIRequest();
                showToastInPage('AI请求超时，请重试', 'error');
            }
        }, 60000); // 60秒
    }
    
    // 结束AI请求
    function endAIRequest() {
        isAIRequestInProgress = false;
        setButtonsState(false);
        
        // 清除超时计时器
        if (aiRequestTimeoutId) {
            clearTimeout(aiRequestTimeoutId);
            aiRequestTimeoutId = null;
        }
    }

    // 在页面上显示toast消息
    function showToastInPage(message, type = 'info', duration = 3000) {
        // 更新状态文本
        statusDiv.textContent = message;
        
        // 设置状态文本样式
        if (type === 'success') {
            statusDiv.style.color = '#52c41a';
        } else if (type === 'error') {
            statusDiv.style.color = '#ff4d4f';
        } else if (type === 'warning') {
            statusDiv.style.color = '#faad14';
        } else {
            statusDiv.style.color = '#1890ff';
        }
        
        // 自动清除状态（仅当不是在AI请求进行中时）
        if (!isAIRequestInProgress || type === 'error' || type === 'warning') {
            setTimeout(() => {
                // 只有当当前消息仍然显示时才清除
                if (statusDiv.textContent === message) {
                    statusDiv.textContent = '';
                    statusDiv.style.color = '';
                }
            }, duration);
        }
        
        // 同时在页面中显示toast
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showToast",
                    message: message,
                    type: type,
                    duration: duration
                }).catch(error => console.log('无法发送消息到内容脚本:', error));
            }
        });
    }

    // 识别页面表单按钮点击事件
    extractFormButton.addEventListener('click', function() {
        showToastInPage('正在识别页面表单元素...', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                showToastInPage('无法获取当前标签页', 'error');
                return;
            }
            
            try {
                // 先尝试检查内容脚本是否正常响应
                chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
                    // 处理可能的连接错误
                    if (chrome.runtime.lastError) {
                        if (handleConnectionError(chrome.runtime.lastError, tabs[0].id, () => {
                            // 脚本重新注入后的回调，延迟执行表单识别
                            setTimeout(() => {
                                executeFormExtraction(tabs[0].id);
                            }, 1000);
                        })) {
                            return;
                        }
                    }
                    
                    // 如果内容脚本响应了ping，或者出现了明确的错误，继续正常流程
                    if (response && response.success) {
                        executeFormExtraction(tabs[0].id);
                    } else {
                        // 如果没有响应也没有错误，可能是内容脚本未加载，尝试注入内容脚本
                        console.log('内容脚本可能未加载，尝试重新注入...');
                        chrome.scripting.executeScript({
                            target: {tabId: tabs[0].id},
                            files: ['content.js']
                        }).then(() => {
                            console.log('内容脚本注入成功，继续识别表单');
                            // 延迟一点时间确保脚本加载完成
                            setTimeout(() => {
                                executeFormExtraction(tabs[0].id);
                            }, 500);
                        }).catch(error => {
                            console.error('注入内容脚本失败:', error);
                            showToastInPage('无法加载表单识别功能，请刷新页面后重试', 'error');
                        });
                    }
                });
            } catch (error) {
                handleConnectionError(error, tabs[0].id);
            }
        });
    });
    
    // 提取表单元素的函数，抽取为单独函数以便重用
    function executeFormExtraction(tabId) {
        chrome.tabs.sendMessage(tabId, {action: "extractXPaths"}, function(response) {
            if (chrome.runtime.lastError) {
                if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                    return;
                }
                console.error('发送消息时出错:', chrome.runtime.lastError);
                showToastInPage('识别表单元素失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                showToastInPage(`已识别 ${response.count} 个表单元素`, 'success');
            } else {
                // 如果识别失败，尝试刷新页面内容脚本状态
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    function: () => {
                        // 重置页面上可能的状态
                        const highlights = document.querySelectorAll('.ai-form-highlight');
                        highlights.forEach(el => el.classList.remove('ai-form-highlight'));
                        return true;
                    }
                }).then(() => {
                    // 再次尝试识别
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, {action: "extractXPaths"}, function(retryResponse) {
                            if (chrome.runtime.lastError) {
                                if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                                    return;
                                }
                                showToastInPage('识别表单元素失败: ' + chrome.runtime.lastError.message, 'error');
                                return;
                            }
                            
                            if (retryResponse && retryResponse.success) {
                                showToastInPage(`已识别 ${retryResponse.count} 个表单元素`, 'success');
                            } else {
                                showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
                            }
                        });
                    }, 300);
                }).catch(error => {
                    console.error('执行脚本时出错:', error);
                    showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
                });
            }
        });
    }

    // 取消识别按钮点击事件
    removeHighlightsButton.addEventListener('click', function() {
        // 如果正在移除高亮，则不重复执行
        if (isHighlightBeingRemoved) {
            return;
        }
        
        isHighlightBeingRemoved = true;
        showToastInPage('正在移除高亮...', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                isHighlightBeingRemoved = false;
                showToastInPage('无法获取当前标签页', 'error');
                return;
            }
            
            try {
                chrome.tabs.sendMessage(tabs[0].id, {action: "removeHighlights"}, function(response) {
                    isHighlightBeingRemoved = false;
                    
                    // 处理可能的连接错误
                    if (chrome.runtime.lastError) {
                        if (handleConnectionError(chrome.runtime.lastError, tabs[0].id)) {
                            return;
                        }
                        showToastInPage('移除高亮失败: ' + chrome.runtime.lastError.message, 'error');
                        return;
                    }
                    
                    if (response && response.success) {
                        showToastInPage('已移除所有高亮', 'success');
                        // 同时清除localStorage中的表单元素数据
                        chrome.scripting.executeScript({
                            target: {tabId: tabs[0].id},
                            func: () => localStorage.removeItem('extractedElements')
                        }).catch(error => {
                            console.error('执行脚本时出错:', error);
                        });
                    } else {
                        showToastInPage('移除高亮失败，请刷新页面后重试', 'error');
                    }
                });
            } catch (error) {
                isHighlightBeingRemoved = false;
                handleConnectionError(error, tabs[0].id);
            }
        });
    });

    // 智能填充表单按钮点击事件
    fillFormButton.addEventListener('click', function() {
        // 如果AI请求正在进行中，则不执行操作
        if (isAIRequestInProgress) {
            showToastInPage('请等待当前请求完成', 'warning');
            return;
        }
        
        const userPrompt = document.getElementById('user-prompt').value.trim();
        
        if (!userPrompt) {
            showToastInPage('请输入您的要求', 'warning');
            return;
        }
        
        // 开始AI请求，禁用按钮
        startAIRequest();
        
        // 获取当前配置
        const config = getCurrentConfig();
        
        // 先识别页面表单，然后再进行填充
        showToastInPage('正在识别页面表单元素...', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                endAIRequest();
                showToastInPage('无法获取当前标签页', 'error');
                return;
            }
            
            try {
                // 先检查内容脚本是否正常响应
                chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
                    // 处理可能的连接错误
                    if (chrome.runtime.lastError) {
                        if (handleConnectionError(chrome.runtime.lastError, tabs[0].id, () => {
                            // 脚本重新注入后的回调，延迟执行表单识别和填充
                            setTimeout(() => {
                                executeFormRecognitionAndFill(tabs[0].id, config, userPrompt);
                            }, 1000);
                        })) {
                            endAIRequest();
                            return;
                        }
                        endAIRequest();
                        showToastInPage('连接到页面失败: ' + chrome.runtime.lastError.message, 'error');
                        return;
                    }
                    
                    if (response && response.success) {
                        // 内容脚本正常响应，继续执行表单识别和填充
                        executeFormRecognitionAndFill(tabs[0].id, config, userPrompt);
                    } else {
                        // 内容脚本未正常响应，尝试重新注入
                        injectContentScriptAndContinue(tabs[0].id, config, userPrompt);
                    }
                });
            } catch (error) {
                endAIRequest();
                handleConnectionError(error, tabs[0].id);
            }
        });
    });
    
    // 注入内容脚本并继续执行
    function injectContentScriptAndContinue(tabId, config, userPrompt) {
        console.log('尝试重新注入内容脚本...');
        chrome.scripting.executeScript({
            target: {tabId: tabId},
            files: ['content.js']
        }).then(() => {
            console.log('内容脚本注入成功，继续识别和填充表单');
            // 延迟一点时间确保脚本加载完成
            setTimeout(() => {
                executeFormRecognitionAndFill(tabId, config, userPrompt);
            }, 500);
        }).catch(error => {
            console.error('注入内容脚本失败:', error);
            endAIRequest();
            showToastInPage('无法加载表单识别功能，请刷新页面后重试', 'error');
        });
    }
    
    // 执行表单识别和填充
    function executeFormRecognitionAndFill(tabId, config, userPrompt) {
        // 先执行表单识别
        chrome.tabs.sendMessage(tabId, {action: "extractXPaths"}, async function(response) {
            // 处理可能的错误
            if (chrome.runtime.lastError) {
                if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                    endAIRequest();
                    return;
                }
                console.error('发送识别消息时出错:', chrome.runtime.lastError);
                endAIRequest();
                showToastInPage('识别表单元素失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                showToastInPage(`已识别 ${response.count} 个表单元素，正在处理填充请求...`, 'success');
                
                // 从localStorage获取表单元素
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    func: () => localStorage.getItem('extractedElements')
                }).then(async (result) => {
                    if (result && result[0] && result[0].result) {
                        try {
                            const formElements = JSON.parse(result[0].result);
                            
                            // 调用大模型API
                            showToastInPage('正在调用AI模型...', 'info');
                            
                            try {
                                const aiResponse = await callAIModel(config, userPrompt, formElements);
                                
                                // 在控制台记录AI返回的内容
                                console.log('AI模型返回的完整内容:', aiResponse);
                                
                                if (aiResponse && aiResponse.formActions) {
                                    // 发送填充表单的指令
                                    chrome.tabs.sendMessage(tabId, {
                                        action: "fillFormElements",
                                        formActions: aiResponse.formActions
                                    }, function(fillResponse) {
                                        // 处理可能的错误
                                        if (chrome.runtime.lastError) {
                                            if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                                                endAIRequest();
                                                return;
                                            }
                                            console.error('发送填充消息时出错:', chrome.runtime.lastError);
                                            endAIRequest();
                                            showToastInPage('填充表单失败: ' + chrome.runtime.lastError.message, 'error');
                                            return;
                                        }
                                        
                                        // 结束AI请求，启用按钮
                                        endAIRequest();
                                        
                                        if (fillResponse && fillResponse.success) {
                                            showToastInPage(`已成功填充 ${fillResponse.count} 个表单元素`, 'success');
                                            
                                            // 自动触发清除识别
                                            setTimeout(() => {
                                                // 如果正在移除高亮，则不重复执行
                                                if (isHighlightBeingRemoved) {
                                                    return;
                                                }
                                                
                                                isHighlightBeingRemoved = true;
                                                chrome.tabs.sendMessage(tabId, {action: "removeHighlights"}, function(response) {
                                                    isHighlightBeingRemoved = false;
                                                    
                                                    // 处理可能的错误
                                                    if (chrome.runtime.lastError) {
                                                        if (handleConnectionError(chrome.runtime.lastError, tabId)) {
                                                            return;
                                                        }
                                                        console.error('发送移除高亮消息时出错:', chrome.runtime.lastError);
                                                        return;
                                                    }
                                                    
                                                    if (response && response.success) {
                                                        console.log('已自动移除所有高亮');
                                                        // 同时清除localStorage中的表单元素数据
                                                        chrome.scripting.executeScript({
                                                            target: {tabId: tabId},
                                                            func: () => localStorage.removeItem('extractedElements')
                                                        });
                                                    }
                                                });
                                            }, 500); // 延迟500毫秒执行，确保填充完成
                                        } else {
                                            showToastInPage('填充表单失败，请重试', 'error');
                                        }
                                    });
                                } else {
                                    endAIRequest();
                                    showToastInPage('AI模型未返回有效的表单操作', 'error');
                                }
                            } catch (error) {
                                endAIRequest();
                                showToastInPage('调用AI模型失败: ' + error.message, 'error');
                            }
                        } catch (error) {
                            endAIRequest();
                            showToastInPage('解析表单元素数据失败: ' + error.message, 'error');
                        }
                    } else {
                        endAIRequest();
                        showToastInPage('未找到已识别的表单元素，请先识别表单', 'warning');
                    }
                }).catch(error => {
                    endAIRequest();
                    console.error('执行脚本时出错:', error);
                    showToastInPage('获取表单元素失败: ' + error.message, 'error');
                });
            } else {
                endAIRequest();
                showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
            }
        });
    }

    // 获取当前配置
    function getCurrentConfig() {
        const modelType = document.querySelector('input[name="model-type"]:checked').value;
        
        if (modelType === 'ollama') {
            const ollamaUrl = document.getElementById('ollama-url').value;
            const ollamaModelValue = document.getElementById('ollama-model').value;
            let modelName = ollamaModelValue;
            
            if (ollamaModelValue === 'custom') {
                modelName = document.getElementById('custom-model-name').value;
            }
            
            return {
                type: 'ollama',
                url: ollamaUrl,
                model: modelName
            };
        } else if (modelType === 'qianwen') {
            const apiKey = document.getElementById('qianwen-api-key').value;
            const model = document.getElementById('qianwen-model').value;
            
            return {
                type: 'qianwen',
                apiKey: apiKey,
                model: model
            };
        }
    }

    // 保存配置到Chrome存储
    function saveConfig() {
        const config = getCurrentConfig();
        chrome.storage.sync.set({modelConfig: config}, function() {
            console.log('配置已保存');
        });
    }

    // 加载保存的配置
    function loadSavedConfig() {
        chrome.storage.sync.get('modelConfig', function(data) {
            if (data.modelConfig) {
                const config = data.modelConfig;
                
                // 设置模型类型
                document.querySelector(`input[name="model-type"][value="${config.type}"]`).checked = true;
                
                if (config.type === 'ollama') {
                    ollamaConfig.classList.remove('hidden');
                    qianwenConfig.classList.add('hidden');
                    
                    // 设置Ollama URL
                    document.getElementById('ollama-url').value = config.url || 'http://localhost:11434';
                    
                    // 设置自定义模型名称（如果有）
                    if (config.model && config.model !== 'custom') {
                        document.getElementById('custom-model-name').value = config.model;
                    }
                    
                    // 尝试获取Ollama模型列表
                    setTimeout(fetchOllamaModels, 500);
                    
                } else if (config.type === 'qianwen') {
                    ollamaConfig.classList.add('hidden');
                    qianwenConfig.classList.remove('hidden');
                    
                    // 设置通义千问API Key
                    document.getElementById('qianwen-api-key').value = config.apiKey || '';
                    
                    // 设置通义千问模型
                    document.getElementById('qianwen-model').value = config.model || 'qwen-turbo';
                }
            } else {
                // 如果没有保存的配置，尝试获取Ollama模型列表
                setTimeout(fetchOllamaModels, 500);
            }
        });
    }

    // 调用AI模型API
    async function callAIModel(config, userPrompt, formElements) {
        try {
            if (config.type === 'ollama') {
                return await callOllamaAPI(config, userPrompt, formElements);
            } else if (config.type === 'qianwen') {
                return await callQianwenAPI(config, userPrompt, formElements);
            }
        } catch (error) {
            console.error('调用AI模型时出错:', error);
            showToastInPage('调用AI模型时出错: ' + error.message, 'error');
            throw error;
        }
    }

    // 调用Ollama API
    async function callOllamaAPI(config, userPrompt, formElements) {
        const url = `${config.url}/api/generate`;
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        const prompt = `${systemPrompt}\n\n用户要求: ${userPrompt}`;
        
        console.log('发送给Ollama的提示词:', prompt);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model,
                prompt: prompt,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama API 请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ollama API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            const jsonMatch = data.response.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('无法从响应中解析JSON');
            }
        } catch (error) {
            console.error('解析Ollama响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 调用通义千问API
    async function callQianwenAPI(config, userPrompt, formElements) {
        const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        
        // 获取当前日期和时间
        const now = new Date();
        const dateTimeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
当前日期和时间是: ${dateTimeStr}

以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容
4. 如果需要填写日期，除非用户明确指定，否则请使用当前日期: ${dateTimeStr}

你的回答必须是一个JSON格式，包含formActions数组，每个元素包含elementId和action（填写内容或选择选项）。
例如：{"formActions":[{"elementId":"email","action":"user@example.com"},{"elementId":"age","action":"30"}]}`;

        console.log('发送给通义千问的提示词:', systemPrompt);
        console.log('用户要求:', userPrompt);
        
        // 根据模型类型选择正确的模型ID
        let modelId;
        switch(config.model) {
            case 'qwen-long':
                modelId = 'qwen-long';
                break;
            case 'qwen-max':
                modelId = 'qwen-max';
            default:
                modelId = 'qwen-long';
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'X-DashScope-SSE': 'disable'  // 禁用流式响应
            },
            body: JSON.stringify({
                model: modelId,
                input: {
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ]
                },
                parameters: {
                    result_format: 'message',
                    temperature: 0.3,  // 较低的温度以获得更确定的回答
                    max_tokens: 2000,
                    top_p: 0.8
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('通义千问API错误:', errorData);
            throw new Error(`通义千问 API 请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('通义千问 API 原始响应:', data);
        
        // 解析响应中的JSON
        try {
            // 检查响应格式
            if (!data.output || !data.output.choices || !data.output.choices[0] || !data.output.choices[0].message) {
                console.error('意外的API响应格式:', data);
                throw new Error('API返回了意外的响应格式');
            }
            
            const content = data.output.choices[0].message.content;
            console.log('通义千问响应内容:', content);
            
            // 尝试提取JSON
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // 如果没有找到JSON格式，尝试解析整个内容
                try {
                    return JSON.parse(content);
                } catch {
                    throw new Error('无法从响应中解析JSON');
                }
            }
        } catch (error) {
            console.error('解析通义千问响应时出错:', error);
            throw new Error('无法解析AI响应: ' + error.message);
        }
    }

    // 动态获取Ollama模型列表
    async function fetchOllamaModels() {
        const ollamaUrl = ollamaUrlInput.value.trim();
        if (!ollamaUrl) return;

        try {
            showToastInPage('正在获取Ollama模型列表...', 'info');
            
            const response = await fetch(`${ollamaUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            }).catch(error => {
                console.error('Fetch错误:', error);
                throw new Error(`无法连接到Ollama服务: ${error.message}`);
            });
            
            if (!response.ok) {
                throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json().catch(error => {
                console.error('解析JSON错误:', error);
                throw new Error('无法解析Ollama服务响应');
            });
            
            if (data && data.models && Array.isArray(data.models)) {
                // 保存当前选中的值
                const currentValue = ollamaModelSelect.value;
                
                // 清空现有选项，只保留"自定义"选项
                while (ollamaModelSelect.options.length > 0) {
                    ollamaModelSelect.remove(0);
                }
                
                // 添加获取到的模型
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    ollamaModelSelect.appendChild(option);
                });
                
                // 添加自定义选项
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = '自定义';
                ollamaModelSelect.appendChild(customOption);
                
                // 尝试恢复之前选中的值
                if (currentValue && Array.from(ollamaModelSelect.options).some(opt => opt.value === currentValue)) {
                    ollamaModelSelect.value = currentValue;
                } else {
                    // 如果之前的值不在新列表中，选择第一个选项
                    ollamaModelSelect.selectedIndex = 0;
                    customModelContainer.classList.add('hidden');
                }
                
                showToastInPage(`已获取 ${data.models.length} 个Ollama模型`, 'success');
            } else {
                console.error('意外的数据格式:', data);
                throw new Error('获取到的模型列表格式不正确');
            }
        } catch (error) {
            console.error('获取Ollama模型列表出错:', error);
            showToastInPage(`获取模型列表失败: ${error.message}`, 'error');
            
            // 添加一些默认模型作为备选
            const defaultModels = ['llama3', 'llama2', 'mistral', 'gemma', 'qwen'];
            
            // 保存当前选中的值
            const currentValue = ollamaModelSelect.value;
            
            // 清空现有选项
            while (ollamaModelSelect.options.length > 0) {
                ollamaModelSelect.remove(0);
            }
            
            // 添加默认模型
            defaultModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                ollamaModelSelect.appendChild(option);
            });
            
            // 添加自定义选项
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = '自定义';
            ollamaModelSelect.appendChild(customOption);
            
            // 尝试恢复之前选中的值
            if (currentValue && Array.from(ollamaModelSelect.options).some(opt => opt.value === currentValue)) {
                ollamaModelSelect.value = currentValue;
            } else {
                ollamaModelSelect.selectedIndex = 0;
            }
        }
    }
}); 