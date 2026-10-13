const assert = require('assert/strict');
const { offensive } = require('../app/models/extensions');

describe('Moderation normalization', () => {
    it('rejects case, full-width and invisible-character evasions', () => {
        for (const text of ['SHIT', 'ｓｈｉｔ', 'sh\u200bit', '傻\u200b逼']) {
            assert.equal(offensive(text), true);
        }
    });
    it('keeps ordinary product descriptions and embedded substrings', () => {
        for (const text of ['Classic bricks', 'Scunthorpe collection', 'Two-person camping tent', 'Stainless steel cookware']) {
            assert.equal(offensive(text), false);
        }
    });
});
