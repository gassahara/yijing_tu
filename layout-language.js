/**
 * MD-LDL (Markdown Layout Definition Language) Parser and Renderer
 * Token-efficient layout definition for Yi Jing interpretations
 * @version 1.0
 */

class LayoutLanguage {
    // ============================================================================
    // PARSER
    // ============================================================================
    
    /**
     * Parse MD-LDL string into AST
     * @param {string} input - MD-LDL source
     * @returns {Object} AST representation
     */
    static parse(input) {
        const lines = input.split('\n');
        const ast = {
            type: 'page',
            props: {},
            sections: []
        };
        
        let currentSection = null;
        let currentLayer = null;
        let currentComponent = null;
        let cardBuffer = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (!trimmed) continue;
            
            // Page declaration
            if (trimmed.startsWith('@page ')) {
                ast.props = this.parseProps(trimmed.slice(6));
                continue;
            }
            
            // Section (##)
            if (trimmed.startsWith('## ')) {
                currentSection = this.parseSection(trimmed.slice(3));
                ast.sections.push(currentSection);
                currentLayer = null;
                continue;
            }
            
            // Layer (###)
            if (trimmed.startsWith('### ')) {
                if (!currentSection) continue;
                currentLayer = this.parseLayer(trimmed.slice(4));
                currentSection.layers.push(currentLayer);
                continue;
            }
            
            // Component (@)
            if (trimmed.startsWith('@')) {
                if (!currentLayer) continue;
                
                const spaceIdx = trimmed.indexOf(' ');
                const compType = spaceIdx > 0 ? trimmed.slice(1, spaceIdx) : trimmed.slice(1);
                const propsStr = spaceIdx > 0 ? trimmed.slice(spaceIdx + 1) : '';
                
                // Handle multi-line components (cards)
                if (compType === 'card') {
                    cardBuffer = {
                        type: 'card',
                        props: this.parseProps(propsStr),
                        header: null,
                        body: [],
                        footer: null
                    };
                    
                    // Read until blank line or new section/component
                    i++;
                    let inBody = false;
                    while (i < lines.length) {
                        const cardLine = lines[i];
                        if (cardLine.trim() === '' || cardLine.startsWith('@') || cardLine.startsWith('#')) {
                            i--;
                            break;
                        }
                        
                        if (cardLine.startsWith('header:')) {
                            cardBuffer.header = cardLine.slice(7).trim();
                        } else if (cardLine.startsWith('footer:')) {
                            cardBuffer.footer = cardLine.slice(7).trim();
                        } else if (cardLine.trim() === '---') {
                            inBody = !inBody;
                        } else if (inBody) {
                            cardBuffer.body.push(cardLine);
                        }
                        i++;
                    }
                    
                    currentLayer.components.push(cardBuffer);
                    cardBuffer = null;
                    continue;
                }
                
                // Handle list component (multi-line)
                if (compType === 'list') {
                    const listComp = {
                        type: 'list',
                        props: this.parseProps(propsStr),
                        items: []
                    };
                    
                    i++;
                    while (i < lines.length) {
                        const listLine = lines[i];
                        if (listLine.trim() === '' || listLine.startsWith('@') || listLine.startsWith('#')) {
                            i--;
                            break;
                        }
                        if (listLine.trim()) {
                            listComp.items.push(listLine.trim());
                        }
                        i++;
                    }
                    
                    currentLayer.components.push(listComp);
                    continue;
                }
                
                // Single-line components
                const component = {
                    type: compType,
                    props: this.parseProps(propsStr),
                    content: null
                };
                
                // Read content if next line is not a directive
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    if (!nextLine.startsWith('@') && !nextLine.startsWith('#') && nextLine.trim()) {
                        component.content = nextLine.trim();
                        i++;
                    }
                }
                
                currentLayer.components.push(component);
                continue;
            }
        }
        
        return ast;
    }
    
    /**
     * Parse properties in {key:value key2:value2} format
     */
    static parseProps(str) {
        const props = {};
        const match = str.match(/\{([^}]*)\}/);
        if (!match) return props;
        
        const content = match[1];
        const pairs = content.split(/\s+/);
        
        for (const pair of pairs) {
            const colonIdx = pair.indexOf(':');
            if (colonIdx > 0) {
                const key = pair.slice(0, colonIdx);
                const value = pair.slice(colonIdx + 1);
                props[key] = value;
            }
        }
        
        return props;
    }
    
    /**
     * Parse section header
     */
    static parseSection(line) {
        const propsMatch = line.match(/\{([^}]*)\}/);
        const props = propsMatch ? this.parseProps(propsMatch[0]) : {};
        const title = line.replace(/\{[^}]*\}/, '').trim();
        
        return {
            type: 'section',
            id: props.id || 'section',
            sectionType: props.type || 'custom',
            props,
            title,
            layers: []
        };
    }
    
    /**
     * Parse layer header
     */
    static parseLayer(line) {
        const propsMatch = line.match(/\{([^}]*)\}/);
        const props = propsMatch ? this.parseProps(propsMatch[0]) : {};
        const label = line.replace(/\{[^}]*\}/, '').trim();
        
        return {
            type: 'layer',
            layerType: props.type || 'generic',
            props,
            label,
            components: []
        };
    }
    
    // ============================================================================
    // RENDERER
    // ============================================================================
    
    /**
     * Render AST to HTML
     * @param {Object} ast - Parsed AST
     * @param {string} containerId - Target container ID
     * @param {string} lang - Language code
     */
    static render(ast, containerId, lang = 'en') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[MD-LDL] Container #${containerId} not found`);
            return;
        }
        
        const t = window.I18N?.[lang] || window.I18N?.['en'] || {};
        const layout = ast.props.layout || 'tabbed';
        
        // Sort sections by order
        const sections = [...ast.sections].sort((a, b) => {
            const orderA = parseInt(a.props.order) || 999;
            const orderB = parseInt(b.props.order) || 999;
            return orderA - orderB;
        });
        
        // Render based on layout
        switch (layout) {
            case 'tabbed':
                container.innerHTML = this.renderTabbed(sections, lang, t);
                break;
            case 'stacked':
                container.innerHTML = this.renderStacked(sections, lang, t);
                break;
            default:
                container.innerHTML = this.renderStacked(sections, lang, t);
        }
        
        // Post-render: initialize interactions
        this.initializeInteractions(container);
    }
    
    /**
     * Render tabbed layout
     */
    static renderTabbed(sections, lang, t) {
        const tabs = sections.map((s, i) => `
            <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${s.id}">
                <span class="tab-icon">${s.props.icon || '📄'}</span>
                <span class="tab-label">${s.title}</span>
            </button>
        `).join('');
        
        const contents = sections.map((s, i) => `
            <div class="tab-content ${i === 0 ? 'active' : ''}" data-tab-content="${s.id}">
                ${this.renderSection(s, lang, t)}
            </div>
        `).join('');
        
        return `
            <div class="ldl-tabs">
                <div class="tab-navigation">${tabs}</div>
                <div class="tab-panels">${contents}</div>
            </div>
        `;
    }
    
    /**
     * Render stacked layout
     */
    static renderStacked(sections, lang, t) {
        return sections.map(s => `
            <div class="ldl-section" data-section="${s.id}">
                ${this.renderSection(s, lang, t)}
            </div>
        `).join('');
    }
    
    /**
     * Render single section
     */
    static renderSection(section, lang, t) {
        const title = section.title || t[section.id] || section.id;
        const icon = section.props.icon || '📄';
        
        // Sort layers by priority
        const layers = [...section.layers].sort((a, b) => {
            const prioA = parseInt(a.props.priority) || 999;
            const prioB = parseInt(b.props.priority) || 999;
            return prioA - prioB;
        });
        
        const layersHtml = layers.map(layer => this.renderLayer(layer, lang, t)).join('');
        
        return `
            <div class="section-card ${section.sectionType}-section">
                <div class="section-header">
                    <span class="section-icon">${icon}</span>
                    <h3 class="section-title">${title}</h3>
                </div>
                <div class="section-body">
                    ${layersHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * Render layer
     */
    static renderLayer(layer, lang, t) {
        const isCollapsed = layer.props.collapsed === 'true';
        const layerTypeClass = `layer-${layer.layerType}`;
        
        // Data layer (collapsible)
        if (layer.layerType === 'data') {
            return `
                <details class="layer ${layerTypeClass}" ${isCollapsed ? '' : 'open'}>
                    <summary class="layer-label">${layer.label}</summary>
                    <div class="layer-content">
                        ${layer.components.map(c => this.renderComponent(c, lang, t)).join('')}
                    </div>
                </details>
            `;
        }
        
        // Standard layer
        return `
            <div class="layer ${layerTypeClass}">
                ${layer.label ? `<div class="layer-label">${layer.label}</div>` : ''}
                <div class="layer-content">
                    ${layer.components.map(c => this.renderComponent(c, lang, t)).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render component
     */
    static renderComponent(comp, lang, t) {
        switch (comp.type) {
            case 'diagram':
                return this.renderDiagram(comp, lang, t);
            case 'text':
                return this.renderText(comp, lang, t);
            case 'badges':
                return this.renderBadges(comp, lang, t);
            case 'card':
                return this.renderCard(comp, lang, t);
            case 'list':
                return this.renderList(comp, lang, t);
            case 'quote':
                return this.renderQuote(comp, lang, t);
            default:
                return `<div class="component-unknown">${comp.type}</div>`;
        }
    }
    
    /**
     * Render diagram component
     */
    static renderDiagram(comp, lang, t) {
        const diagramType = comp.props.type || 'generic';
        const content = comp.content || '';
        
        // Parse diagram data
        const data = {};
        content.split('|').forEach(pair => {
            const [key, value] = pair.split(':');
            if (key && value) data[key.trim()] = value.trim();
        });
        
        // Different rendering based on type
        switch (diagramType) {
            case 'bazi':
                return this.renderBaziDiagram(data, lang);
            case 'mansion':
                return this.renderMansionDiagram(data, lang);
            case 'elements':
                return this.renderElementsDiagram(data, lang);
            default:
                return `<div class="diagram-generic" data-type="${diagramType}">${content}</div>`;
        }
    }
    
    /**
     * Render text component
     */
    static renderText(comp, lang, t) {
        const className = comp.props.class || 'text-content';
        const content = comp.content || '';
        
        // Process inline highlights [Type:Value:Zh]
        const processed = content.replace(/\[([^\]]+)\]/g, (match, inner) => {
            const parts = inner.split(':');
            if (parts.length >= 2) {
                const [type, value, zh] = parts;
                return this.renderInlineBadge(type, value, zh, lang);
            }
            return match;
        });
        
        return `<div class="${className}">${processed}</div>`;
    }
    
    /**
     * Render badges component
     */
    static renderBadges(comp, lang, t) {
        const content = comp.content || '';
        const badges = content.split('|').map(item => {
            const [type, label, zh] = item.split(':');
            return this.renderBadge(type, label, zh, lang);
        }).join('');
        
        return `<div class="badge-row">${badges}</div>`;
    }
    
    /**
     * Render card component
     */
    static renderCard(comp, lang, t) {
        const style = comp.props.style || 'default';
        const header = comp.header ? `<div class="card-header">${comp.header}</div>` : '';
        const footer = comp.footer ? `<div class="card-footer">${comp.footer}</div>` : '';
        const body = comp.body.map(line => `<p>${line}</p>`).join('');
        
        return `
            <div class="ldl-card card-${style}">
                ${header}
                <div class="card-body">${body}</div>
                ${footer}
            </div>
        `;
    }
    
    /**
     * Render list component
     */
    static renderList(comp, lang, t) {
        const isNumbered = comp.props.numbered === 'true';
        const items = comp.items.map((item, i) => 
            `<li class="list-item">${item}</li>`
        ).join('');
        
        if (isNumbered) {
            return `<ol class="ldl-list numbered">${items}</ol>`;
        }
        return `<ul class="ldl-list">${items}</ul>`;
    }
    
    /**
     * Render quote component
     */
    static renderQuote(comp, lang, t) {
        const source = comp.props.source || '';
        const content = comp.content || '';
        
        return `
            <blockquote class="ldl-quote">
                <p class="quote-text">${content}</p>
                ${source ? `<cite class="quote-source">— ${source}</cite>` : ''}
            </blockquote>
        `;
    }
    
    // ============================================================================
    // HELPERS
    // ============================================================================
    
    static renderBadge(type, label, zh, lang) {
        const classes = `badge badge-${type.toLowerCase()}`;
        const zhSpan = zh ? `<span class="badge-zh">${zh}</span>` : '';
        return `<span class="${classes}">${zhSpan}<span class="badge-label">${label}</span></span>`;
    }
    
    static renderInlineBadge(type, value, zh, lang) {
        return this.renderBadge(type, value, zh, lang);
    }
    
    static renderBaziDiagram(data, lang) {
        // Delegate to existing UI renderers
        if (typeof UI !== 'undefined' && UI.generateBaziHtml) {
            return UI.generateBaziHtml(data, lang);
        }
        return `<div class="diagram-bazi">${JSON.stringify(data)}</div>`;
    }
    
    static renderMansionDiagram(data, lang) {
        return `<div class="diagram-mansion">${data.Mansion || ''}</div>`;
    }
    
    static renderElementsDiagram(data, lang) {
        // Convert to visualization
        const bars = Object.entries(data).map(([el, val]) => {
            const pct = parseInt(val) || 0;
            return `
                <div class="element-bar">
                    <span class="element-name">${el}</span>
                    <div class="element-track">
                        <div class="element-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="element-value">${val}%</span>
                </div>
            `;
        }).join('');
        
        return `<div class="diagram-elements">${bars}</div>`;
    }
    
    static initializeInteractions(container) {
        // Tab switching
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                container.querySelector(`[data-tab-content="${tabId}"]`).classList.add('active');
            });
        });
    }
    
    // ============================================================================
    // CONVERSION
    // ============================================================================
    
    /**
     * Convert JSON interpretation to MD-LDL
     */
    static fromInterpretation(interp, lang) {
        const lines = [];
        
        lines.push(`@page {lang:${lang} layout:tabbed}`);
        lines.push('');
        
        // Celestial section
        if (interp.celestial) {
            lines.push(`## {id:celestial type:celestial icon:🌟 order:1}`);
            lines.push(lang === 'es' ? 'Contexto Celestial' : 
                       lang === 'it' ? 'Contesto Celeste' : 'Celestial Context');
            lines.push('');
            lines.push(`### {type:analysis priority:1}`);
            lines.push('');
            lines.push(`@text {class:technical}`);
            lines.push(interp.celestial);
            lines.push('');
        }
        
        // Elements section
        if (interp.elements) {
            lines.push(`## {id:elements type:elements icon:🔄 order:2}`);
            lines.push(lang === 'es' ? 'Cinco Elementos' :
                       lang === 'it' ? 'Cinque Elementi' : 'Five Elements');
            lines.push('');
            lines.push(`### {type:analysis priority:1}`);
            lines.push('');
            lines.push(`@text {class:technical}`);
            lines.push(interp.elements);
            lines.push('');
        }
        
        // Analysis section
        if (interp.analysis) {
            lines.push(`## {id:analysis type:analysis icon:🔍 order:3}`);
            lines.push(lang === 'es' ? 'Análisis del Hexagrama' :
                       lang === 'it' ? 'Analisi dell\'Esagramma' : 'Hexagram Analysis');
            lines.push('');
            lines.push(`### {type:analysis priority:1}`);
            lines.push('');
            lines.push(`@text {class:classical}`);
            lines.push(interp.analysis);
            lines.push('');
        }
        
        // Advice section
        if (interp.advice) {
            lines.push(`## {id:advice type:advice icon:💡 order:4}`);
            lines.push(lang === 'es' ? 'Orientaciones' :
                       lang === 'it' ? 'Orientamenti' : 'Guidance');
            lines.push('');
            lines.push(`### {type:list priority:1}`);
            lines.push('');
            lines.push(`@list {numbered:true}`);
            // Split advice into numbered items
            const items = interp.advice.split(/\d+\./).filter(i => i.trim());
            items.forEach(item => lines.push(item.trim()));
            lines.push('');
        }
        
        return lines.join('\n');
    }
    
    /**
     * Convert parsed AST back to MD-LDL string
     */
    static toMDL(ast) {
        const lines = [];
        
        // Page declaration
        if (ast.props) {
            const props = Object.entries(ast.props).map(([k, v]) => `${k}:${v}`).join(' ');
            lines.push(`@page {${props}}`);
            lines.push('');
        }
        
        // Sections
        if (ast.sections) {
            for (const section of ast.sections) {
                const sProps = Object.entries(section.props).map(([k, v]) => `${k}:${v}`).join(' ');
                lines.push(`## {${sProps}}`);
                lines.push(section.title);
                lines.push('');
                
                // Layers
                if (section.layers) {
                    for (const layer of section.layers) {
                        const lProps = Object.entries(layer.props).map(([k, v]) => `${k}:${v}`).join(' ');
                        lines.push(`### {${lProps}}`);
                        if (layer.label) lines.push(layer.label);
                        lines.push('');
                        
                        // Components
                        if (layer.components) {
                            for (const comp of layer.components) {
                                const cProps = Object.entries(comp.props || {}).map(([k, v]) => `${k}:${v}`).join(' ');
                                lines.push(`@${comp.type}${cProps ? ' {' + cProps + '}' : ''}`);
                                
                                if (comp.content?.raw) {
                                    lines.push(comp.content.raw);
                                } else if (comp.body) {
                                    if (comp.header) lines.push(`header:${comp.header}`);
                                    lines.push('---');
                                    lines.push(...comp.body);
                                    lines.push('---');
                                    if (comp.footer) lines.push(`footer:${comp.footer}`);
                                } else if (comp.items) {
                                    lines.push(...comp.items);
                                }
                                lines.push('');
                            }
                        }
                    }
                }
            }
        }
        
        return lines.join('\n');
    }
}

// Expose to global scope
window.LayoutLanguage = LayoutLanguage;
