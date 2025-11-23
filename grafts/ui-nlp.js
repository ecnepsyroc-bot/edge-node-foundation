/**
 * GRAFT: UI ↔ NLP
 * 
 * Provides NLP processing to client-side UI
 * This graft will be used via API endpoints
 * NLP processor is now in services/nlp/
 */

class UINLPGraft {
  constructor(nlpProcessor) {
    this.nlp = nlpProcessor;
  }

  /**
   * Process message text for color coding
   */
  processMessage(text) {
    return {
      original: text,
      segments: this.nlp.colorCodeText(text),
      html: this.nlp.getColorCodedHTML(text),
      analysis: this.nlp.analyzeText(text)
    };
  }

  /**
   * Handle NLP API request
   */
  handleNLPRequest(req, res, serverFunctions) {
    if (req.url === '/api/nlp/process' && req.method === 'POST') {
      serverFunctions.parseBody(req, (err, data) => {
        if (err || !data.text) {
          serverFunctions.sendJSON(res, 400, { error: 'Text required' });
          return;
        }

        const result = this.processMessage(data.text);
        serverFunctions.sendJSON(res, 200, result);
      });
      return true;
    }

    return false;
  }
}

module.exports = UINLPGraft;
