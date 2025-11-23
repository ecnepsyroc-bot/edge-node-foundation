/**
 * RAMUS: NLP
 * 
 * Part-of-speech tagging and text color-coding using compromise.js
 */

const nlp = require('compromise');

// Color mappings for parts of speech
const POS_COLORS = {
  noun: '#4CAF50',      // Green
  verb: '#F44336',      // Red
  adjective: '#FFD700', // Gold
  adverb: '#FF9800',    // Orange
  preposition: '#2196F3', // Blue
  pronoun: '#9C27B0',   // Purple
  conjunction: '#795548', // Brown
  determiner: '#607D88' // Blue-grey
};

class NLPProcessor {
  /**
   * Process text and return color-coded segments
   */
  colorCodeText(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const doc = nlp(text);
    const segments = [];

    // Get terms with their tags
    doc.terms().forEach(term => {
      const termText = term.text();
      const tags = term.json()[0]?.terms[0]?.tags || [];
      
      // Determine color based on first matching tag
      let color = '#FFFFFF'; // Default white
      
      if (tags.includes('Noun')) {
        color = POS_COLORS.noun;
      } else if (tags.includes('Verb')) {
        color = POS_COLORS.verb;
      } else if (tags.includes('Adjective')) {
        color = POS_COLORS.adjective;
      } else if (tags.includes('Adverb')) {
        color = POS_COLORS.adverb;
      } else if (tags.includes('Preposition')) {
        color = POS_COLORS.preposition;
      } else if (tags.includes('Pronoun')) {
        color = POS_COLORS.pronoun;
      } else if (tags.includes('Conjunction')) {
        color = POS_COLORS.conjunction;
      } else if (tags.includes('Determiner')) {
        color = POS_COLORS.determiner;
      }

      segments.push({
        text: termText,
        color: color,
        tags: tags
      });
    });

    return segments;
  }

  /**
   * Get HTML with color-coded spans
   */
  getColorCodedHTML(text) {
    const segments = this.colorCodeText(text);
    
    return segments.map(seg => 
      `<span style="color: ${seg.color}">${this.escapeHtml(seg.text)}</span>`
    ).join(' ');
  }

  /**
   * Get plain text analysis
   */
  analyzeText(text) {
    if (!text || typeof text !== 'string') {
      return {
        nouns: [],
        verbs: [],
        adjectives: [],
        adverbs: [],
        sentences: 0,
        words: 0
      };
    }

    const doc = nlp(text);

    return {
      nouns: doc.nouns().out('array'),
      verbs: doc.verbs().out('array'),
      adjectives: doc.adjectives().out('array'),
      adverbs: doc.adverbs().out('array'),
      sentences: doc.sentences().length,
      words: doc.terms().length
    };
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = NLPProcessor;
