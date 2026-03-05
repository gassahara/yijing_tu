# Markdown Layout Definition Language (MD-LDL) Specification

## Overview

MD-LDL is a token-efficient, Markdown-based language for defining page layouts. It uses minimal syntax while maintaining structure.

## Design Principles

1. **Token Efficiency**: Minimize brackets, quotes, and repetitive keywords
2. **Human Readable**: Easy to read and debug
3. **AI-Friendly**: Simple pattern for LLMs to generate
4. **Hierarchical**: Clear section/component nesting

## Syntax

### 1. Page Declaration

```markdown
@page {lang:es layout:tabbed theme:dark}
```

### 2. Sections

```markdown
## {id:celestial type:celestial icon:🌟 order:1}
Contexto Celestial
```

### 3. Layers

Layers are defined with `###` and layer type:

```markdown
### {type:data collapsed:true priority:1}
Datos Técnicos
```

### 4. Components

Components use `@` prefix with type and properties:

```markdown
@diagram {type:bazi}
Year:Jia-Metal|Month:Bing-Fire|Day:Ding-Fire|Hour:Ren-Water
```

```markdown
@text {class:technical}
El DayMaster Tierra indica estabilidad y paciencia.
La ausencia de otros elementos sugiere concentración.
```

```markdown
@badges
Wood:Madera:木|Fire:Fuego:火|Earth:Tierra:土
```

```markdown
@card {style:colloquial}
header:Tu situación actual
---
Este es un momento para mantener la calma y reflexionar.
---
footer:Aplica esta sabiduría con paciencia
```

### 5. Lists

```markdown
@list {type:advice numbered:true}
Mantén la calma ante las dificultades
Reflexiona antes de actuar
Busca guía en tradiciones antiguas
```

### 6. Quotes

```markdown
@quote {source:Yijing 52}
Manteniendo la espalda quieta, ya no siente el cuerpo.
```

## Complete Example

```markdown
@page {lang:es layout:tabbed}

## {id:celestial type:celestial icon:🌟 order:1}
Contexto Celestial

### {type:data collapsed:true}
Datos Técnicos

@diagram {type:bazi}
Year:Jia-Wood|Month:Bing-Fire|Day:Ding-Fire|Hour:Ren-Water

@diagram {type:mansion}
Mansion:Star:Ox:Earth

### {type:analysis}
Análisis Técnico

@badges
Wood:Madera:木|Fire:Fuego:火|Earth:Tierra:土|Metal:Metal:金|Water:Agua:水

@text {class:technical}
El hexagrama 52 representa la quietud y la montaña. El DayMaster
Tierra equilibrado indica estabilidad emocional. La mansión lunar
Star sugiere reflexión profunda.

### {type:colloquial}
Interpretación

@card {style:colloquial}
header:Para tu situación
---
Este es un momento de pausa necesaria. Como una montaña que
permanece firme, debes mantener tu centro interno tranquilo.
Las respuestas vendrán de la quietud, no de la acción forzada.
---
footer:Sé paciente y observa

## {id:elements type:elements icon:🔄 order:2}
Cinco Elementos

### {type:analysis}
Balance Elemental

@diagram {type:elements}
Wood:20|Fire:30|Earth:25|Metal:15|Water:10

@text
El Fuego domina con 30%, indicando pasión y transformación.
La Tierra en 25% proporciona estabilidad. El desequilibrio
hacia el Agua (10%) sugiere escasez de fluidez.

## {id:analysis type:analysis icon:🔍 order:3}
Análisis del Hexagrama

### {type:technical}
Análisis Clásico

@badges
Trigram:Gen:Montaña:艮

@text {class:classical}
Las dos montañas se apoyan mutuamente. El superior mantiene
la quietud, el inferior sostiene la base. Este es el tiempo
de la contemplación interior.

@quote {source:Yijing 52 Judgment}
Manteniendo la espalda quieta, ya no siente el cuerpo.
Caminando por el patio, ya no ve a las personas.
Sin culpa.

### {type:colloquial}
Aplicación Práctica

@text
En tu situación actual, este hexagrama sugiere que debes
detener la actividad externa y volver tu atención hacia
dentro. Las respuestas no vendrán de la acción, sino de
la quietud consciente.

## {id:advice type:advice icon:💡 order:4}
Orientaciones

### {type:list}
Consejos Prácticos

@list {numbered:true}
Detén la actividad frenética y respira profundamente
Meditación diaria de 10 minutos en silencio
No tomes decisiones importantes esta semana
Reflexiona sobre tus verdaderas prioridades

### {type:references collapsed:true}
Referencias Clásicas

@quote {source:Image Commentary}
Sobre la montaña hay una montaña: la imagen de Manteniendo
la Espalda Quieta. Así el noble no contempla más allá de su posición.

@quote {source:Line 6}
Manteniendo la espalda quieta, la buena fortuna es auspiciosa.
```

## Parser Rules

### 1. Line-by-Line Parsing

```javascript
function parseMDL(input) {
  const lines = input.split('\n');
  const stack = [{ type: 'page', children: [] }];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('@page ')) {
      stack[0].props = parseProps(trimmed.slice(6));
    } else if (trimmed.startsWith('## ')) {
      // Section
      const section = parseSection(trimmed.slice(3));
      stack[0].children.push(section);
      stack[1] = section;
    } else if (trimmed.startsWith('### ')) {
      // Layer
      const layer = parseLayer(trimmed.slice(4));
      stack[1].layers.push(layer);
      stack[2] = layer;
    } else if (trimmed.startsWith('@')) {
      // Component
      const comp = parseComponent(trimmed);
      stack[2].components.push(comp);
    }
  }
  
  return stack[0];
}
```

### 2. Property Parsing

Properties are in `{key:value key2:value2}` format:

```javascript
function parseProps(str) {
  const props = {};
  const regex = /(\w+):([^\s}]+)/g;
  let match;
  while ((match = regex.exec(str))) {
    props[match[1]] = match[2];
  }
  return props;
}
```

### 3. Component Types

| Component | Syntax | Properties |
|-----------|--------|------------|
| diagram | `@diagram {type:bazi}` | type, size |
| text | `@text {class:technical}` | class, align |
| badges | `@badges` | (inline items) |
| card | `@card {style:colloquial}` | style, header, footer |
| list | `@list {numbered:true}` | numbered, type |
| quote | `@quote {source:Yijing}` | source, author |

### 4. Badge Format

```
Type:Label:Zh|Type:Label:Zh
```

Example:
```
Wood:Madera:木|Fire:Fuego:火
```

### 5. Card Format

```markdown
@card {style:colloquial}
header:Header text
---
Body content here...
Can be multiple lines.
---
footer:Footer text
```

### 6. Text Content

Text after `@text` or in card body supports inline highlights:

```markdown
@text
El elemento [Fire:Fuego] domina con 30%.
El [Trigram:Gen:艮] representa montaña.
```

## Token Comparison

### JSON (verbose):
```json
{"section":{"id":"celestial","title":"Contexto Celestial","components":[{"type":"text","content":"El DayMaster..."}]}}
```
~120 tokens

### MD-LDL (token-efficient):
```markdown
## {id:celestial}
Contexto Celestial

@text
El DayMaster...
```
~25 tokens (80% reduction)

## Benefits

1. **Token Efficient**: ~80% fewer tokens than JSON
2. **Readable**: Easy to debug and understand
3. **Structured**: Clear hierarchy with # and @
4. **Flexible**: Easy to extend with new component types
5. **AI-Friendly**: Simple pattern, minimal syntax

## Implementation

```javascript
class MDLDLParser {
  parse(input) {
    // Parse MD-LDL to internal representation
  }
  
  render(ast, container, lang) {
    // Render to DOM
  }
}
```
