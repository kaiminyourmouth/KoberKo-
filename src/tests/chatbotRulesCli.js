import assert from 'node:assert/strict';
import { askGroq } from '../services/groq.js';

const sampleContext = {
  conditionId: 'DENGUE',
  conditionName: 'Dengue Fever',
  memberType: 'SSS',
  hospitalLevel: 'level2',
  hospitalType: 'DOH',
  roomType: 'WARD',
  coverageAmount: 19500,
  coverageVariantKey: null,
};

async function run() {
  const filNoContext = await askGroq('Magkano po ang babayaran namin sa ospital?', null, []);
  assert.match(filNoContext.message, /Intake/i);
  assert.match(filNoContext.message, /mas tumpak|accurate/i);

  const cebKonsulta = await askGroq('Unsa ang PhilHealth Konsulta?', null, []);
  assert.match(cebKonsulta.message, /Konsulta/i);
  assert.match(cebKonsulta.message, /Base kini sa datos sa KoberKo/i);

  const taglishNoContext = await askGroq('Pwede ba direct filing for our case?', null, []);
  assert.match(taglishNoContext.message, /Intake/i);
  assert.match(taglishNoContext.message, /accurate/i);

  const billingReply = await askGroq('Ayaw mag direct file ang hospital namin. Ano sasabihin ko sa billing?', sampleContext, []);
  assert.match(billingReply.message, /billing/i);
  assert.match(billingReply.message, /PhilHealth Circular|PhilHealth Circular 2024/i);

  const financialReply = await askGroq('Hindi na namin kaya ang natitirang bill', null, []);
  assert.match(financialReply.message, /Malasakit/i);
  assert.match(financialReply.message, /PCSO/i);
  assert.match(financialReply.message, /DSWD/i);

  const deniedReply = await askGroq('Na-deny ang claim namin, ano gagawin?', null, []);
  assert.match(deniedReply.message, /Motion for Reconsideration|MR/i);

  console.log('chatbot rules checks passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
