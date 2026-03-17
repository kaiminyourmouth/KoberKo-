import benefits from '../data/benefits.json';
import conditions from '../data/conditions.json';
import documents from '../data/documents.json';
import scripts from '../data/scripts.json';

export function runDataAudit() {
  if (import.meta.env.PROD) {
    return null;
  }

  const report = {
    totalConditions: conditions.length,
    missingBenefits: [],
    missingScripts: [],
    missingDocuments: [],
    estimatedAmounts: [],
    missingRedFlags: [],
    missingBilingualFields: [],
  };

  for (const condition of conditions) {
    const id = condition.id;

    if (!benefits[id]) {
      report.missingBenefits.push(id);
    } else {
      const benefit = benefits[id];
      if (benefit.confidence === 'estimated') {
        report.estimatedAmounts.push(id);
      }
      if (!benefit.rates?.level2) {
        report.missingBenefits.push(`${id} missing level2 rate`);
      }
    }

    if (!scripts[id]) {
      report.missingScripts.push(id);
    } else {
      const script = scripts[id];
      if (!script.billingScript_fil) {
        report.missingBilingualFields.push(`${id} missing billingScript_fil`);
      }
      if (!script.billingScript_en) {
        report.missingBilingualFields.push(`${id} missing billingScript_en`);
      }
      if (!script.redFlags || script.redFlags.length === 0) {
        report.missingRedFlags.push(id);
      }
    }

    const packageType = benefits[id]?.packageType;
    if (packageType && !documents[packageType]) {
      report.missingDocuments.push(`${id} (packageType: ${packageType})`);
    }
  }

  console.group('🔍 KoberKo Data Audit');
  console.log(`Total conditions: ${report.totalConditions}`);

  if (report.missingBenefits.length > 0) {
    console.warn('❌ Missing benefits:', report.missingBenefits);
  } else {
    console.log('✅ All conditions have benefit entries');
  }

  if (report.estimatedAmounts.length > 0) {
    console.warn('⚠️ Estimated amounts (verify before video):', report.estimatedAmounts);
  } else {
    console.log('✅ All amounts are verified');
  }

  if (report.missingScripts.length > 0) {
    console.warn('❌ Missing scripts:', report.missingScripts);
  } else {
    console.log('✅ All conditions have billing scripts');
  }

  if (report.missingRedFlags.length > 0) {
    console.warn('⚠️ Missing red flags:', report.missingRedFlags);
  } else {
    console.log('✅ All conditions have red flags');
  }

  if (report.missingBilingualFields.length > 0) {
    console.warn('⚠️ Missing bilingual fields:', report.missingBilingualFields);
  } else {
    console.log('✅ All bilingual fields present');
  }

  if (report.missingDocuments.length > 0) {
    console.warn('⚠️ Missing documents config:', report.missingDocuments);
  } else {
    console.log('✅ All package types have document checklists');
  }

  console.groupEnd();
  return report;
}
