```json
// 翻译工会 DAO分类数据库结构
{
  '翻译已过（天）': {
    id: '%3CWXx',
    name: '翻译已过（天）',
    type: 'formula',
    formula: { expression: 'dateBetween(now(), prop("翻译启动时间"), "days")' }
  },
  '积分': {
    id: 'A%7Ck%3E',
    name: '积分',
    type: 'formula',
    formula: { expression: 'prop("英文词数") * 1.8' }
  },
  '关键词': { id: 'COGD', name: '关键词', type: 'rich_text', rich_text: {} },
  '知识沉淀': { id: 'Gb%5CQ', name: '知识沉淀', type: 'checkbox', checkbox: {} },
  '校对已过（天）': {
    id: 'Ihtp',
    name: '校对已过（天）',
    type: 'formula',
    formula: { expression: 'dateBetween(now(), prop("校对启动时间"), "days")' }
  },
  '英文词数': {
    id: 'KBAm',
    name: '英文词数',
    type: 'number',
    number: { format: 'number' }
  },
  '翻译': { id: 'QCkn', name: '翻译', type: 'people', people: {} },
  '信源': { id: 'SF%3Av', name: '信源', type: 'rich_text', rich_text: {} },
  '校对启动时间': { id: 'XLMX', name: '校对启动时间', type: 'date', date: {} },
  '状态': {
    id: 'Z%5Dp%3E',
    name: '状态',
    type: 'select',
    select: { options: [Array] }
  },
  Abstract: { id: 'ZbrY', name: 'Abstract', type: 'rich_text', rich_text: {} },
  '翻译启动时间': { id: '%60%3Dm%3D', name: '翻译启动时间', type: 'date', date: {} },
  POAP: {
    id: 'aeM%3A',
    name: 'POAP',
    type: 'select',
    select: { options: [Array] }
  },
  '公众号🔗': { id: 'jiKO', name: '公众号🔗', type: 'rich_text', rich_text: {} },
  '英文标题': { id: 'qrex', name: '英文标题', type: 'rich_text', rich_text: {} },
  '积分是否录入': {
    id: 'vQ%5El',
    name: '积分是否录入',
    type: 'select',
    select: { options: [Array] }
  },
  Theme: {
    id: 'ynGo',
    name: 'Theme',
    type: 'select',
    select: { options: [Array] }
  },
  'Mirror🔗': { id: '%7CJwm', name: 'Mirror🔗', type: 'rich_text', rich_text: {} },
  '原文作者': { id: '~QoF', name: '原文作者', type: 'rich_text', rich_text: {} },
  '校对': { id: '~r%7Dq', name: '校对', type: 'rich_text', rich_text: {} },
  '原文链接': { id: '~xZY', name: '原文链接', type: 'rich_text', rich_text: {} },
  '译文': { id: 'title', name: '译文', type: 'title', title: {} },
  '译文评价': {
    id: '8ad7d8c9-a8f1-40e5-bb55-df2885be8856',
    name: '译文评价',
    type: 'rich_text',
    rich_text: {}
  }
}
```
