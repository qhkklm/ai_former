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
            
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractXPaths"}, function(response) {
                if (response && response.success) {
                    showToastInPage(`已识别 ${response.count} 个表单元素`, 'success');
                } else {
                    showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
                }
            });
        });
    });

    // 取消识别按钮点击事件
    removeHighlightsButton.addEventListener('click', function() {
        showToastInPage('正在移除高亮...', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs[0] || !tabs[0].id) {
                showToastInPage('无法获取当前标签页', 'error');
                return;
            }
            
            chrome.tabs.sendMessage(tabs[0].id, {action: "removeHighlights"}, function(response) {
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
            
            // 先执行表单识别
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractXPaths"}, async function(response) {
                if (response && response.success) {
                    showToastInPage(`已识别 ${response.count} 个表单元素，正在处理填充请求...`, 'success');
                    
                    // 从localStorage获取表单元素
                    chrome.scripting.executeScript({
                        target: {tabId: tabs[0].id},
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
                                        chrome.tabs.sendMessage(tabs[0].id, {
                                            action: "fillFormElements",
                                            formActions: aiResponse.formActions
                                        }, function(fillResponse) {
                                            // 结束AI请求，启用按钮
                                            endAIRequest();
                                            
                                            if (fillResponse && fillResponse.success) {
                                                showToastInPage(`已成功填充 ${fillResponse.count} 个表单元素`, 'success');
                                            } else {
                                                showToastInPage('填充表单失败，请重试', 'error');
                                            }
                                        });
                                    } else {
                                        // 结束AI请求，启用按钮
                                        endAIRequest();
                                        showToastInPage('无法理解如何填充表单，请尝试更清晰的描述', 'warning');
                                    }
                                } catch (error) {
                                    // 结束AI请求，启用按钮
                                    endAIRequest();
                                    console.error('调用AI模型时出错:', error);
                                    showToastInPage('调用AI模型时出错: ' + error.message, 'error');
                                }
                            } catch (error) {
                                // 结束AI请求，启用按钮
                                endAIRequest();
                                console.error('处理表单填充时出错:', error);
                                showToastInPage('处理请求时出错: ' + error.message, 'error');
                            }
                        } else {
                            // 结束AI请求，启用按钮
                            endAIRequest();
                            showToastInPage('无法获取表单元素，请刷新页面后重试', 'error');
                        }
                    }).catch(error => {
                        endAIRequest();
                        console.error('执行脚本时出错:', error);
                        showToastInPage('执行脚本时出错: ' + error.message, 'error');
                    });
                } else {
                    // 结束AI请求，启用按钮
                    endAIRequest();
                    showToastInPage('识别表单元素失败，请刷新页面后重试', 'error');
                }
            });
        });
    });

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
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容

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
        
        // 构建提示词
        const systemPrompt = `你是一个智能表单填充助手。根据用户的要求，帮助用户填写表单。
以下是页面上的表单元素列表：
${JSON.stringify(formElements, null, 2)}

请根据用户的要求，确定应该填写哪些表单元素以及填写什么内容。
特别注意：
1. 对于contenteditable元素（可编辑的div），需要填写文本内容
2. 对于复杂表单元素（type为complex的元素），可能需要填写其内部的输入元素
3. 如果是评论框、留言框等，请根据用户要求生成合适的内容

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
                modelId = 'qwen-turbo';
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