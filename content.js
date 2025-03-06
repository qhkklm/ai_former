function getXPath(element) {
    if (element.id !== '') {
        return `//*[@id="${element.id}"]`;
    }
    if (element === document.body) {
        return '/html/body';
    }

    let ix = 0;
    let siblings = element.parentNode.childNodes;

    for (let i = 0; i < siblings.length; i++) {
        let sibling = siblings[i];
        if (sibling === element) {
            let path = getXPath(element.parentNode);
            let tag = element.tagName.toLowerCase();
            return `${path}/${tag}[${ix + 1}]`;
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }
}

function getListValues(element) {
    let values = [];
    if (element.tagName.toLowerCase() === 'select') {
        Array.from(element.options).forEach(option => {
            values.push({
                text: option.text,
                value: option.value
            });
        });
    } else if (element.tagName.toLowerCase() === 'ul' || element.tagName.toLowerCase() === 'ol') {
        Array.from(element.getElementsByTagName('li')).forEach(li => {
            values.push(li.textContent.trim());
        });
    }
    return values;
}

// 添加生成唯一ID的函数
function generateUniqueId(element) {
    // 如果元素已经有id，直接返回
    if (element.id) {
        return element.id;
    }

    // 生成一个基于元素特征的唯一ID
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    const tagName = element.tagName.toLowerCase();
    const name = element.name || '';
    const className = element.className || '';
    const type = element.type || '';
    
    // 组合特征生成唯一ID
    const uniqueId = `auto_${tagName}_${type}_${name}_${className}_${timestamp}_${random}`.replace(/[^a-zA-Z0-9]/g, '_');
    
    // 将生成的ID设置到元素上
    element.id = uniqueId;
    
    return uniqueId;
}

// 添加高亮样式函数
function addHighlightStyle() {
    if (!document.getElementById('highlight-style')) {
        const style = document.createElement('style');
        style.id = 'highlight-style';
        style.textContent = `
            .element-highlight {
                outline: 2px solid #ff6b6b !important;
                background-color: rgba(255, 107, 107, 0.1) !important;
                transition: all 0.3s ease-in-out !important;
            }
            .element-highlight:hover {
                outline: 2px solid #ff4757 !important;
                background-color: rgba(255, 107, 107, 0.2) !important;
            }
            .element-tooltip {
                position: absolute;
                background: #333;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 10000;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }
}

// 添加获取纯HTML的函数
function getPureHTML(element) {
    // 创建一个新的div来存放克隆的元素
    const container = document.createElement('div');
    const clone = element.cloneNode(true);
    
    // 移除所有script标签
    const scripts = clone.getElementsByTagName('script');
    while(scripts.length > 0) {
        scripts[0].parentNode.removeChild(scripts[0]);
    }
    
    // 移除所有style标签
    const styles = clone.getElementsByTagName('style');
    while(styles.length > 0) {
        styles[0].parentNode.removeChild(styles[0]);
    }
    
    // 移除所有元素的style属性和class属性
    function cleanElement(el) {
        if (el.removeAttribute) {
            el.removeAttribute('style');
            el.removeAttribute('class');
        }
        if (el.children) {
            Array.from(el.children).forEach(cleanElement);
        }
    }
    cleanElement(clone);
    
    // 格式化HTML
    function formatHTML(node, level = 0) {
        const indent = '    '.repeat(level);
        let html = '';
        
        if (node.nodeType === 3) { // 文本节点
            const text = node.textContent.trim();
            if (text) {
                html += indent + text + '\n';
            }
        } else if (node.nodeType === 1) { // 元素节点
            const tagName = node.tagName.toLowerCase();
            
            // 开始标签
            html += indent + '<' + tagName;
            
            // 添加id和name属性（如果有）
            if (node.id) html += ` id="${node.id}"`;
            if (node.name) html += ` name="${node.name}"`;
            if (node.value) html += ` value="${node.value}"`;
            if (node.type) html += ` type="${node.type}"`;
            
            if (node.children.length === 0 && !node.textContent.trim()) {
                html += '/>\n';
            } else {
                html += '>\n';
                
                // 处理子节点
                Array.from(node.childNodes).forEach(child => {
                    html += formatHTML(child, level + 1);
                });
                
                // 结束标签
                if (node.children.length > 0 || node.textContent.trim()) {
                    html += indent + '</' + tagName + '>\n';
                }
            }
        }
        return html;
    }
    
    container.appendChild(clone);
    return formatHTML(clone);
}

// 添加Toast消息功能
function showToast(message, type = 'info', duration = 3000) {
    // 移除现有的toast
    const existingToast = document.getElementById('form-assistant-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.id = 'form-assistant-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '10000';
    toast.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    toast.style.transition = 'opacity 0.3s ease-in-out';
    
    // 根据类型设置样式
    if (type === 'success') {
        toast.style.backgroundColor = '#52c41a';
        toast.style.color = 'white';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#ff4d4f';
        toast.style.color = 'white';
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#faad14';
        toast.style.color = 'white';
    } else {
        toast.style.backgroundColor = '#1890ff';
        toast.style.color = 'white';
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 自动消失
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
    
    return toast;
}

// 修改extractFormElements函数，添加清空之前结果的功能
function extractFormElements() {
    // 清空之前的识别结果
    localStorage.removeItem('extractedElements');
    
    addHighlightStyle();
    const results = [];

    // 处理主文档中的元素
    processDocument(document, results);

    // 处理所有iframe中的元素
    const iframes = document.getElementsByTagName('iframe');
    Array.from(iframes).forEach(iframe => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            processDocument(iframeDoc, results);
        } catch (e) {
            console.log('无法访问iframe内容，可能是跨域限制:', e);
        }
    });

    localStorage.setItem('extractedElements', JSON.stringify(results));
    console.log('页面元素XPath提取结果：', results);
    
    // 显示toast消息
    showToast(`已识别 ${results.length} 个表单元素`, 'success');
    
    return results;
}

// 新增处理文档的函数
function processDocument(doc, results) {
    // 获取所有表单相关元素
    const formElements = doc.querySelectorAll('input, select, textarea, button, [contenteditable="true"]');
    formElements.forEach(element => {
        const uniqueId = generateUniqueId(element);
        
        // 添加高亮类
        element.classList.add('element-highlight');
        
        // 添加鼠标悬停提示
        element.addEventListener('mouseover', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'element-tooltip';
            tooltip.textContent = `ID: ${uniqueId}
Type: ${element.tagName.toLowerCase()}${element.getAttribute('contenteditable') ? ' (contenteditable)' : element.type ? ` (${element.type})` : ''}
Name: ${element.name || 'N/A'}`;
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
            document.body.appendChild(tooltip);
        });

        element.addEventListener('mouseout', () => {
            const tooltips = document.querySelectorAll('.element-tooltip');
            tooltips.forEach(t => t.remove());
        });

        const elementInfo = {
            uniqueId: uniqueId,
            type: element.getAttribute('contenteditable') ? 'contenteditable' : element.type || element.tagName.toLowerCase(),
            xpath: getXPath(element),
            name: element.name || '',
            originalId: element.id === uniqueId ? '' : element.id,
            inIframe: doc !== document,
            pureHTML: getPureHTML(element),
            isContentEditable: element.getAttribute('contenteditable') === 'true'
        };

        // 处理select元素的选项
        if (element.tagName.toLowerCase() === 'select') {
            elementInfo.values = getListValues(element);
        }

        // 获取其他属性
        if (element.placeholder) elementInfo.placeholder = element.placeholder;
        if (element.value) elementInfo.value = element.value;
        if (element.className) elementInfo.className = element.className;
        if (element.getAttribute('contenteditable') === 'true') {
            elementInfo.value = element.textContent.trim();
            elementInfo.placeholder = element.getAttribute('placeholder') || '';
        }

        // 检查是否在form内
        const parentForm = element.closest('form');
        if (parentForm) {
            elementInfo.formXPath = getXPath(parentForm);
            elementInfo.formId = generateUniqueId(parentForm);
        }

        results.push(elementInfo);
    });

    // 处理列表元素
    const lists = doc.querySelectorAll('ul, ol');
    lists.forEach(list => {
        const uniqueId = generateUniqueId(list);
        results.push({
            uniqueId: uniqueId,
            type: 'list',
            xpath: getXPath(list),
            values: getListValues(list),
            originalId: list.id === uniqueId ? '' : list.id,
            inIframe: doc !== document,
            pureHTML: getPureHTML(list)
        });
    });
    
    // 处理可能的复杂表单组件（如富文本编辑器、自定义下拉框等）
    const complexFormElements = doc.querySelectorAll('.text-editor, .el-select, .el-input, [role="textbox"], [role="combobox"]');
    complexFormElements.forEach(element => {
        // 避免重复处理已经处理过的元素
        if (element.classList.contains('element-highlight')) {
            return;
        }
        
        const uniqueId = generateUniqueId(element);
        
        // 添加高亮类
        element.classList.add('element-highlight');
        
        // 添加鼠标悬停提示
        element.addEventListener('mouseover', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'element-tooltip';
            tooltip.textContent = `ID: ${uniqueId}
Type: 复杂表单元素 (${element.className})
Role: ${element.getAttribute('role') || 'N/A'}`;
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
            document.body.appendChild(tooltip);
        });

        element.addEventListener('mouseout', () => {
            const tooltips = document.querySelectorAll('.element-tooltip');
            tooltips.forEach(t => t.remove());
        });
        
        // 查找内部的输入元素
        const innerInputs = element.querySelectorAll('input, [contenteditable="true"]');
        let innerInputId = '';
        if (innerInputs.length > 0) {
            innerInputId = innerInputs[0].id || generateUniqueId(innerInputs[0]);
            // 也为内部元素添加高亮
            innerInputs.forEach(input => {
                input.classList.add('element-highlight');
            });
        }
        
        results.push({
            uniqueId: uniqueId,
            type: 'complex',
            xpath: getXPath(element),
            className: element.className,
            role: element.getAttribute('role') || '',
            innerInputId: innerInputId,
            inIframe: doc !== document,
            pureHTML: getPureHTML(element),
            isComplex: true
        });
    });
}

// 修改removeHighlights函数，添加toast消息
function removeHighlights() {
    // 移除主文档中的高亮元素
    const highlightedElements = document.querySelectorAll('.element-highlight');
    highlightedElements.forEach(element => {
        element.classList.remove('element-highlight');
        // 移除可能添加的样式
        element.style.backgroundColor = '';
        element.style.border = '';
    });
    
    // 移除所有tooltip
    const tooltips = document.querySelectorAll('.element-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
    
    // 移除高亮样式
    const style = document.getElementById('highlight-style');
    if (style) {
        style.remove();
    }
    
    // 尝试清除iframe中的高亮
    const iframes = document.getElementsByTagName('iframe');
    Array.from(iframes).forEach(iframe => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const iframeHighlightedElements = iframeDoc.querySelectorAll('.element-highlight');
            iframeHighlightedElements.forEach(element => {
                element.classList.remove('element-highlight');
                element.style.backgroundColor = '';
                element.style.border = '';
            });
            
            const iframeTooltips = iframeDoc.querySelectorAll('.element-tooltip');
            iframeTooltips.forEach(tooltip => tooltip.remove());
        } catch (e) {
            console.log('无法访问iframe内容，可能是跨域限制:', e);
        }
    });
    
    // 清除localStorage中的数据
    localStorage.removeItem('extractedElements');
    
    // 显示toast消息
    showToast('已移除所有高亮', 'info');
}

// 获取整个页面的纯HTML结构
function getPagePureHTML() {
    // 克隆整个文档
    const clone = document.documentElement.cloneNode(true);
    
    // 移除整个head标签
    const head = clone.getElementsByTagName('head');
    if (head.length > 0) {
        head[0].parentNode.removeChild(head[0]);
    }

    // 移除所有SVG
    const svgs = clone.getElementsByTagName('svg');
    while(svgs.length > 0) {
        svgs[0].parentNode.removeChild(svgs[0]);
    }
    
    // 移除所有元素的style属性和class属性
    function cleanElement(el) {
        if (el.removeAttribute) {
            el.removeAttribute('style');
            el.removeAttribute('class');
            // 移除所有以'data-'开头的属性
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    el.removeAttribute(attr.name);
                }
            });
        }
        if (el.children) {
            Array.from(el.children).forEach(cleanElement);
        }
    }
    cleanElement(clone);
    
    // 格式化HTML
    function formatHTML(node, level = 0) {
        let html = '';
        
        if (node.nodeType === 3) { // 文本节点
            const text = node.textContent.trim();
            if (text) {
                html += text.replace(/\s+/g, ' ');
            }
        } else if (node.nodeType === 1) { // 元素节点
            const tagName = node.tagName.toLowerCase();
            
            // 跳过注释节点、SVG和其他特殊节点
            if (tagName === '!' || tagName === 'svg' || tagName === 'head') return '';
            
            // 开始标签
            html += '<' + tagName;
            
            // 添加必要的属性
            Array.from(node.attributes).forEach(attr => {
                if (!attr.name.startsWith('data-') && 
                    attr.name !== 'style' && 
                    attr.name !== 'class') {
                    html += ` ${attr.name}="${attr.value}"`;
                }
            });
            
            if (node.children.length === 0 && !node.textContent.trim()) {
                html += '/>';
            } else {
                html += '>';
                
                // 处理子节点
                Array.from(node.childNodes).forEach(child => {
                    html += formatHTML(child, 0);
                });
                
                html += '</' + tagName + '>';
            }
        }
        return html;
    }
    
    // 输出到控制台
    const pureHTML = formatHTML(clone)
        .replace(/>\s+</g, '><') // 移除标签之间的空白
        .replace(/\n\s*/g, '') // 移除换行和相关空白
        .replace(/<svg.*?<\/svg>/gs, '') // 额外的SVG清理
        .replace(/<head>.*?<\/head>/gs, ''); // 额外的head标签清理
    
    console.log('压缩后的纯HTML结构：\n', pureHTML);
    return pureHTML;
}

// 修改fillFormElement函数来处理contenteditable元素
function fillFormElement(elementId, action) {
    // 通过ID查找元素
    let element = document.getElementById(elementId);
    
    if (!element) {
        console.error(`未找到ID为 ${elementId} 的元素`);
        return false;
    }
    
    try {
        const tagName = element.tagName.toLowerCase();
        
        // 处理contenteditable元素
        if (element.getAttribute('contenteditable') === 'true') {
            element.textContent = action;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            // 触发blur事件以确保内容保存
            setTimeout(() => {
                element.dispatchEvent(new Event('blur', { bubbles: true }));
            }, 100);
            
            // 高亮已填充的元素
            element.style.backgroundColor = 'rgba(144, 238, 144, 0.2)';
            element.style.border = '1px solid green';
            
            // 3秒后恢复原样
            setTimeout(() => {
                element.style.backgroundColor = '';
                element.style.border = '';
            }, 3000);
            
            return true;
        }
        
        // 处理复杂表单元素
        if (element.classList.contains('text-editor') || 
            element.classList.contains('el-select') || 
            element.classList.contains('el-input')) {
            
            // 查找内部的输入元素
            const innerInputs = element.querySelectorAll('input, [contenteditable="true"]');
            if (innerInputs.length > 0) {
                const innerInput = innerInputs[0];
                
                if (innerInput.getAttribute('contenteditable') === 'true') {
                    innerInput.textContent = action;
                    innerInput.dispatchEvent(new Event('input', { bubbles: true }));
                    innerInput.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(() => {
                        innerInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    }, 100);
                } else {
                    innerInput.value = action;
                    innerInput.dispatchEvent(new Event('input', { bubbles: true }));
                    innerInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // 高亮已填充的元素
                element.style.backgroundColor = 'rgba(144, 238, 144, 0.2)';
                element.style.border = '1px solid green';
                
                // 3秒后恢复原样
                setTimeout(() => {
                    element.style.backgroundColor = '';
                    element.style.border = '';
                }, 3000);
                
                return true;
            }
        }
        
        // 根据元素类型执行不同的填充操作
        if (tagName === 'input') {
            const inputType = element.type.toLowerCase();
            
            if (inputType === 'text' || inputType === 'email' || inputType === 'password' || 
                inputType === 'tel' || inputType === 'number' || inputType === 'url' || 
                inputType === 'search' || inputType === 'date' || inputType === 'datetime-local') {
                // 文本类型输入框
                element.value = action;
                // 触发input和change事件
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (inputType === 'checkbox') {
                // 复选框
                const shouldCheck = action === true || action === 'true' || action === 'checked' || action === 'yes';
                element.checked = shouldCheck;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (inputType === 'radio') {
                // 单选按钮
                element.checked = true;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else if (tagName === 'select') {
            // 下拉选择框
            const options = Array.from(element.options);
            
            // 尝试通过值匹配
            const valueOption = options.find(opt => opt.value === action);
            if (valueOption) {
                element.value = action;
            } else {
                // 尝试通过文本匹配
                const textOption = options.find(opt => opt.text.toLowerCase() === action.toLowerCase());
                if (textOption) {
                    element.value = textOption.value;
                } else {
                    // 尝试部分匹配
                    const partialMatch = options.find(opt => 
                        opt.text.toLowerCase().includes(action.toLowerCase()) || 
                        action.toLowerCase().includes(opt.text.toLowerCase())
                    );
                    if (partialMatch) {
                        element.value = partialMatch.value;
                    } else {
                        console.warn(`未找到与 "${action}" 匹配的选项`);
                        return false;
                    }
                }
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (tagName === 'textarea') {
            // 文本区域
            element.value = action;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.warn(`不支持填充 ${tagName} 类型的元素`);
            return false;
        }
        
        // 高亮已填充的元素
        element.style.backgroundColor = 'rgba(144, 238, 144, 0.2)';
        element.style.border = '1px solid green';
        
        // 3秒后恢复原样
        setTimeout(() => {
            element.style.backgroundColor = '';
            element.style.border = '';
        }, 3000);
        
        return true;
    } catch (error) {
        console.error(`填充元素 ${elementId} 时出错:`, error);
        return false;
    }
}

// 填充iframe中的表单元素
function fillIframeFormElements(iframeDoc, elementId, action) {
    try {
        const element = iframeDoc.getElementById(elementId);
        if (!element) {
            return false;
        }
        
        // 在iframe文档中执行相同的填充逻辑
        const tagName = element.tagName.toLowerCase();
        
        // 处理contenteditable元素
        if (element.getAttribute('contenteditable') === 'true') {
            element.textContent = action;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            // 触发blur事件以确保内容保存
            setTimeout(() => {
                element.dispatchEvent(new Event('blur', { bubbles: true }));
            }, 100);
            
            // 高亮已填充的元素
            element.style.backgroundColor = 'rgba(144, 238, 144, 0.2)';
            element.style.border = '1px solid green';
            
            // 3秒后恢复原样
            setTimeout(() => {
                element.style.backgroundColor = '';
                element.style.border = '';
            }, 3000);
            
            return true;
        }
        
        // 处理复杂表单元素
        if (element.classList.contains('text-editor') || 
            element.classList.contains('el-select') || 
            element.classList.contains('el-input')) {
            
            // 查找内部的输入元素
            const innerInputs = element.querySelectorAll('input, [contenteditable="true"]');
            if (innerInputs.length > 0) {
                const innerInput = innerInputs[0];
                
                if (innerInput.getAttribute('contenteditable') === 'true') {
                    innerInput.textContent = action;
                    innerInput.dispatchEvent(new Event('input', { bubbles: true }));
                    innerInput.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(() => {
                        innerInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    }, 100);
                } else {
                    innerInput.value = action;
                    innerInput.dispatchEvent(new Event('input', { bubbles: true }));
                    innerInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // 高亮已填充的元素
                element.style.backgroundColor = 'rgba(144, 238, 144, 0.2)';
                element.style.border = '1px solid green';
                
                // 3秒后恢复原样
                setTimeout(() => {
                    element.style.backgroundColor = '';
                    element.style.border = '';
                }, 3000);
                
                return true;
            }
        }
        
        if (tagName === 'input') {
            const inputType = element.type.toLowerCase();
            
            if (inputType === 'text' || inputType === 'email' || inputType === 'password' || 
                inputType === 'tel' || inputType === 'number' || inputType === 'url' || 
                inputType === 'search' || inputType === 'date' || inputType === 'datetime-local') {
                element.value = action;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (inputType === 'checkbox') {
                const shouldCheck = action === true || action === 'true' || action === 'checked' || action === 'yes';
                element.checked = shouldCheck;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (inputType === 'radio') {
                element.checked = true;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else if (tagName === 'select') {
            const options = Array.from(element.options);
            
            const valueOption = options.find(opt => opt.value === action);
            if (valueOption) {
                element.value = action;
            } else {
                const textOption = options.find(opt => opt.text.toLowerCase() === action.toLowerCase());
                if (textOption) {
                    element.value = textOption.value;
                } else {
                    const partialMatch = options.find(opt => 
                        opt.text.toLowerCase().includes(action.toLowerCase()) || 
                        action.toLowerCase().includes(opt.text.toLowerCase())
                    );
                    if (partialMatch) {
                        element.value = partialMatch.value;
                    } else {
                        return false;
                    }
                }
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (tagName === 'textarea') {
            element.value = action;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            return false;
        }
        
        // 高亮已填充的元素
        element.style.backgroundColor = 'rgba(144, 238, 144, 0.2)';
        element.style.border = '1px solid green';
        
        setTimeout(() => {
            element.style.backgroundColor = '';
            element.style.border = '';
        }, 3000);
        
        return true;
    } catch (error) {
        console.error(`填充iframe中的元素 ${elementId} 时出错:`, error);
        return false;
    }
}

// 修改handleFormFill函数，添加toast消息
function handleFormFill(formActions) {
    console.log('AI返回的表单填充指令:', formActions);
    
    let successCount = 0;
    
    // 获取所有iframe
    const iframes = document.getElementsByTagName('iframe');
    
    // 遍历每个表单操作
    formActions.forEach(action => {
        const { elementId, action: actionValue } = action;
        
        // 尝试在主文档中填充
        if (fillFormElement(elementId, actionValue)) {
            successCount++;
        } else {
            // 如果主文档中没有找到元素，尝试在iframe中查找
            let filledInIframe = false;
            
            Array.from(iframes).forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (fillIframeFormElements(iframeDoc, elementId, actionValue)) {
                        successCount++;
                        filledInIframe = true;
                    }
                } catch (e) {
                    console.log('无法访问iframe内容，可能是跨域限制:', e);
                }
            });
            
            if (!filledInIframe) {
                console.warn(`未能填充ID为 ${elementId} 的元素`);
            }
        }
    });
    
    // 显示toast消息
    if (successCount > 0) {
        showToast(`已成功填充 ${successCount} 个表单元素`, 'success');
    } else {
        showToast('未能填充任何表单元素', 'warning');
    }
    
    return successCount;
}

// 修改消息监听器部分
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractXPaths") {
        removeHighlights(); // 先清除现有的高亮
        const results = extractFormElements(); // 这会添加新的高亮
        // 输出纯HTML但不影响高亮
        setTimeout(() => {
            getPagePureHTML();
        }, 100);
        sendResponse({success: true, count: results.length});
    } else if (request.action === "getPureHTML") {
        // 单独获取纯HTML而不影响高亮
        const pureHTML = getPagePureHTML();
        sendResponse({success: true, html: pureHTML});
    } else if (request.action === "removeHighlights") {
        removeHighlights();
        sendResponse({success: true});
    } else if (request.action === "fillFormElements") {
        // 处理表单填充请求
        const successCount = handleFormFill(request.formActions);
        sendResponse({success: true, count: successCount});
    } else if (request.action === "showToast") {
        // 显示toast消息
        showToast(request.message, request.type, request.duration);
        sendResponse({success: true});
    }
    return true;
}); 