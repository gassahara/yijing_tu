/**
 * ============================================================
 *  Bagua Core Library
 * ============================================================
 * 
 *  Handles both Houtian (Later Heaven) and Xiantian (Early Heaven)
 *  bagua arrangements. Pure library - no DOM dependencies.
 */

'use strict';

const BaguaCore = {
  // Houtian (Later Heaven) - Post-heaven arrangement
  // Used for: manifested reality, feng shui, daily life situations
  HOUTIAN: {
    name: 'houtian',
    zhName: '後天八卦',
    description: 'Later Heaven arrangement - for manifested reality and daily life',
    trigrams: [
      { name: 'Li', zh: '離', dir: 'S', angle: -90, binary: '101', element: 'Fire', color: '#F44336', number: 9, lifeArea: 'Fame', spiritual: 'Clarity' },
      { name: 'Xun', zh: '巽', dir: 'SE', angle: -45, binary: '110', element: 'Wood', color: '#8BC34A', number: 4, lifeArea: 'Wealth', spiritual: 'Gentle Penetration' },
      { name: 'Zhen', zh: '震', dir: 'E', angle: 0, binary: '001', element: 'Wood', color: '#4CAF50', number: 3, lifeArea: 'Family', spiritual: 'Arousing Movement' },
      { name: 'Gen', zh: '艮', dir: 'NE', angle: 45, binary: '100', element: 'Earth', color: '#00BCD4', number: 8, lifeArea: 'Knowledge', spiritual: 'Still Mountain' },
      { name: 'Kan', zh: '坎', dir: 'N', angle: 90, binary: '010', element: 'Water', color: '#2196F3', number: 1, lifeArea: 'Career', spiritual: 'Abysmal Water' },
      { name: 'Qian', zh: '乾', dir: 'NW', angle: 135, binary: '111', element: 'Metal', color: '#FF9800', number: 6, lifeArea: 'Benefactors', spiritual: 'Creative Heaven' },
      { name: 'Dui', zh: '兌', dir: 'W', angle: 180, binary: '011', element: 'Metal', color: '#FFC107', number: 7, lifeArea: 'Children', spiritual: 'Joyful Lake' },
      { name: 'Kun', zh: '坤', dir: 'SW', angle: -135, binary: '000', element: 'Earth', color: '#E91E63', number: 2, lifeArea: 'Relationships', spiritual: 'Receptive Earth' }
    ]
  },

  // Xiantian (Early Heaven) - Primordial arrangement
  // Used for: congenital nature, spiritual cultivation, inner alchemy
  XIANTIAN: {
    name: 'xiantian',
    zhName: '先天八卦',
    description: 'Early Heaven arrangement - for primordial nature and spiritual cultivation',
    trigrams: [
      { name: 'Qian', zh: '乾', dir: 'S', angle: -90, binary: '111', element: 'Heaven', color: '#FF9800', number: 6, spiritual: 'Pure Yang / Spirit (Shen)' },
      { name: 'Dui', zh: '兌', dir: 'SE', angle: -45, binary: '011', element: 'Metal', color: '#FFC107', number: 7, spiritual: 'Soul (Hun) / Joy' },
      { name: 'Li', zh: '離', dir: 'E', angle: 0, binary: '101', element: 'Fire', color: '#F44336', number: 9, spiritual: 'Intention (Yi) / Clarity' },
      { name: 'Zhen', zh: '震', dir: 'NE', angle: 45, binary: '001', element: 'Wood', color: '#4CAF50', number: 3, spiritual: 'Will (Zhi) / Arousing' },
      { name: 'Kun', zh: '坤', dir: 'N', angle: 90, binary: '000', element: 'Earth', color: '#E91E63', number: 2, spiritual: 'Pure Yin / Body (Jing)' },
      { name: 'Gen', zh: '艮', dir: 'NW', angle: 135, binary: '100', element: 'Earth', color: '#00BCD4', number: 8, spiritual: 'Intuition (Po) / Stillness' },
      { name: 'Kan', zh: '坎', dir: 'W', angle: 180, binary: '010', element: 'Water', color: '#2196F3', number: 1, spiritual: 'Vitality (Jing) / Danger' },
      { name: 'Xun', zh: '巽', dir: 'SW', angle: -135, binary: '110', element: 'Wind', color: '#8BC34A', number: 4, spiritual: 'Breath (Qi) / Gentle' }
    ]
  },

  getArrangement(name) {
    return name === 'xiantian' ? this.XIANTIAN : this.HOUTIAN;
  },

  getTrigram(name, arrangement = 'houtian') {
    const arr = this.getArrangement(arrangement);
    return arr.trigrams.find(t => t.name === name);
  },

  getByDirection(dir, arrangement = 'houtian') {
    const arr = this.getArrangement(arrangement);
    return arr.trigrams.find(t => t.dir === dir);
  },

  getByBinary(binary, arrangement = 'houtian') {
    const arr = this.getArrangement(arrangement);
    return arr.trigrams.find(t => t.binary === binary);
  },

  // Get opposite trigram (across the center)
  getOpposite(trigramName, arrangement = 'houtian') {
    const opposites = {
      houtian: { Li: 'Kan', Kan: 'Li', Xun: 'Zhen', Zhen: 'Xun', Qian: 'Kun', Kun: 'Qian', Dui: 'Gen', Gen: 'Dui' },
      xiantian: { Qian: 'Kun', Kun: 'Qian', Dui: 'Gen', Gen: 'Dui', Li: 'Kan', Kan: 'Li', Zhen: 'Xun', Xun: 'Zhen' }
    };
    const opp = opposites[arrangement]?.[trigramName];
    return opp ? this.getTrigram(opp, arrangement) : null;
  },

  // Get trigram pair for a hexagram (upper and lower)
  getHexagramTrigrams(upperBinary, lowerBinary, arrangement = 'houtian') {
    return {
      upper: this.getByBinary(upperBinary, arrangement),
      lower: this.getByBinary(lowerBinary, arrangement)
    };
  },

  // Spiritual interpretation helpers
  getSpiritualAspect(trigramName, arrangement = 'houtian') {
    const t = this.getTrigram(trigramName, arrangement);
    return t?.spiritual || t?.lifeArea || t?.name;
  },

  // Compare two arrangements for a trigram
  compareTrigram(name) {
    const houtian = this.getTrigram(name, 'houtian');
    const xiantian = this.getTrigram(name, 'xiantian');
    return {
      name,
      houtian: houtian ? { dir: houtian.dir, element: houtian.element, lifeArea: houtian.lifeArea } : null,
      xiantian: xiantian ? { dir: xiantian.dir, element: xiantian.element, spiritual: xiantian.spiritual } : null,
      samePosition: houtian?.dir === xiantian?.dir,
      sameElement: houtian?.element === xiantian?.element
    };
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BaguaCore };
} else {
  window.BaguaCore = BaguaCore;
}
