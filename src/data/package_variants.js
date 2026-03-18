const CASE_RATE_2025_URL =
  'https://www.philhealth.gov.ph/circulars/2024/0037/AnnexA-ListofMedicalCaseRates.pdf';
const EXCLUDED_2025_URL =
  'https://www.philhealth.gov.ph/circulars/2024/0037/AnnexC-ListofExcludedBenefitsfrom50Adjustment.pdf';
const BENEFITS_URL = 'https://www.philhealth.gov.ph/benefits/index.php';
const AMI_URL = 'https://www.philhealth.gov.ph/circulars/2024/archives.php';
const packageVariants = {
  CAP: {
    title_fil: 'Anong severity ng pulmonya ang nasa chart?',
    title_en: 'What pneumonia severity is in the chart?',
    note_fil:
      'Ginagamit ito para maitugma ang exact PhilHealth package sa final diagnosis. Kung hindi pa sigurado, gamitin muna ang mas karaniwang moderate-risk option at i-confirm sa doktor o PhilHealth coordinator.',
    note_en:
      'This matches the exact PhilHealth package to the final diagnosis. If the chart is not final yet, start with the more common moderate-risk option and confirm with the doctor or PhilHealth coordinator.',
    defaultKey: 'moderate',
    options: [
      {
        key: 'moderate',
        label_fil: 'CAP III / moderate risk',
        label_en: 'CAP III / moderate risk',
        desc_fil: 'Karaniwang admitted pneumonia na kailangan ng oxygen, IV antibiotics, at ward o regular room care.',
        desc_en: 'Common admitted pneumonia needing oxygen, IV antibiotics, and ward or regular room care.',
        amount: 29250,
        circular: 'PhilHealth Circular 2024-0037 Annex A',
        circularUrl: CASE_RATE_2025_URL,
        packageName_fil: 'Case Rate para sa Community-Acquired Pneumonia (CAP III / moderate risk)',
        packageName_en: 'Case Rate for Community-Acquired Pneumonia (CAP III / moderate risk)',
        variantUsed_fil: 'Variant used ngayon: CAP III / moderate risk (J18.92)',
        variantUsed_en: 'Variant used now: CAP III / moderate risk (J18.92)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex A for CAP III / moderate-risk pneumonia (J18.92).',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex A for CAP III / moderate-risk pneumonia (J18.92).',
      },
      {
        key: 'high_risk',
        label_fil: 'CAP IV / high risk',
        label_en: 'CAP IV / high risk',
        desc_fil: 'Mas malubhang pulmonya na may sepsis, respiratory failure, o ICU-level monitoring.',
        desc_en: 'More severe pneumonia with sepsis, respiratory failure, or ICU-level monitoring.',
        amount: 90100,
        circular: 'PhilHealth Circular 2024-0037 Annex C',
        circularUrl: EXCLUDED_2025_URL,
        packageName_fil: 'Case Rate para sa Community-Acquired Pneumonia (CAP IV / high risk)',
        packageName_en: 'Case Rate for Community-Acquired Pneumonia (CAP IV / high risk)',
        variantUsed_fil: 'Variant used ngayon: CAP IV / high risk (J18.93)',
        variantUsed_en: 'Variant used now: CAP IV / high risk (J18.93)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex C for CAP IV / high-risk pneumonia (J18.93) at P90,100.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex C for CAP IV / high-risk pneumonia (J18.93) at PHP 90,100.',
      },
    ],
  },
  DENGUE: {
    title_fil: 'Anong dengue severity ang nasa chart?',
    title_en: 'What dengue severity is in the chart?',
    note_fil:
      'Ang exact PhilHealth package ay naka-base sa documented severity. Kung hindi pa final ang chart, gamitin muna ang pinaka-malapit na severity at i-confirm bago discharge.',
    note_en:
      'The exact PhilHealth package depends on the documented severity. If the chart is not final yet, choose the closest severity and confirm before discharge.',
    defaultKey: 'warning_signs',
    options: [
      {
        key: 'without_warning_signs',
        label_fil: 'Dengue without warning signs',
        label_en: 'Dengue without warning signs',
        desc_fil: 'Admitted dengue na walang shock o severe bleeding.',
        desc_en: 'Admitted dengue without shock or severe bleeding.',
        amount: 19500,
        circular: 'PhilHealth Circular 2024-0037 Annex A',
        circularUrl: CASE_RATE_2025_URL,
        packageName_fil: 'Case Rate para sa Dengue without warning signs',
        packageName_en: 'Case Rate for Dengue without warning signs',
        variantUsed_fil: 'Variant used ngayon: dengue without warning signs (A97.0)',
        variantUsed_en: 'Variant used now: dengue without warning signs (A97.0)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex A for dengue without warning signs (A97.0) at P19,500.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex A for dengue without warning signs (A97.0) at PHP 19,500.',
      },
      {
        key: 'warning_signs',
        label_fil: 'Dengue with warning signs',
        label_en: 'Dengue with warning signs',
        desc_fil: 'May dehydration, persistent vomiting, o ibang warning signs pero hindi pa severe dengue.',
        desc_en: 'With dehydration, persistent vomiting, or other warning signs but not yet severe dengue.',
        amount: 19500,
        circular: 'PhilHealth Circular 2024-0037 Annex A',
        circularUrl: CASE_RATE_2025_URL,
        packageName_fil: 'Case Rate para sa Dengue with warning signs',
        packageName_en: 'Case Rate for Dengue with warning signs',
        variantUsed_fil: 'Variant used ngayon: dengue with warning signs (A97.1)',
        variantUsed_en: 'Variant used now: dengue with warning signs (A97.1)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex A for dengue with warning signs (A97.1) at P19,500.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex A for dengue with warning signs (A97.1) at PHP 19,500.',
      },
      {
        key: 'severe',
        label_fil: 'Severe dengue',
        label_en: 'Severe dengue',
        desc_fil: 'May shock, severe bleeding, organ involvement, o ICU-level monitoring.',
        desc_en: 'With shock, severe bleeding, organ involvement, or ICU-level monitoring.',
        amount: 47000,
        circular: 'PhilHealth Circular 2024-0037 Annex C',
        circularUrl: EXCLUDED_2025_URL,
        packageName_fil: 'Case Rate para sa Severe Dengue',
        packageName_en: 'Case Rate for Severe Dengue',
        variantUsed_fil: 'Variant used ngayon: severe dengue (A97.2)',
        variantUsed_en: 'Variant used now: severe dengue (A97.2)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex C for severe dengue (A97.2) at P47,000.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex C for severe dengue (A97.2) at PHP 47,000.',
      },
    ],
  },
  DIABETES: {
    title_fil: 'Aling diabetes admission ang pinakaangkop?',
    title_en: 'Which diabetes admission best matches the chart?',
    note_fil:
      'Mahalagang piliin ito dahil iba ang official PhilHealth amount para sa uncomplicated, complicated, at coma/ketoacidosis admissions.',
    note_en:
      'This matters because PhilHealth uses different official amounts for uncomplicated, complicated, and coma or ketoacidosis admissions.',
    defaultKey: 'with_complications',
    options: [
      {
        key: 'without_complications',
        label_fil: 'Type 2 diabetes without complications',
        label_en: 'Type 2 diabetes without complications',
        desc_fil: 'Na-admit pero walang documented organ complication o DKA/coma sa chart.',
        desc_en: 'Admitted case without a documented organ complication or DKA/coma in the chart.',
        amount: 7800,
        circular: 'PhilHealth Circular 2024-0037 Annex A',
        circularUrl: CASE_RATE_2025_URL,
        packageName_fil: 'Case Rate para sa Type 2 diabetes without complications',
        packageName_en: 'Case Rate for Type 2 diabetes without complications',
        variantUsed_fil: 'Variant used ngayon: Type 2 diabetes without complications (E11.9)',
        variantUsed_en: 'Variant used now: Type 2 diabetes without complications (E11.9)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex A for Type 2 diabetes without complications (E11.9) at P7,800.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex A for Type 2 diabetes without complications (E11.9) at PHP 7,800.',
      },
      {
        key: 'with_complications',
        label_fil: 'Type 2 diabetes with complications',
        label_en: 'Type 2 diabetes with complications',
        desc_fil: 'May documented kidney, vascular, neurologic, o ibang covered complication sa chart.',
        desc_en: 'With a documented kidney, vascular, neurologic, or other covered complication in the chart.',
        amount: 24570,
        circular: 'PhilHealth Circular 2024-0037 Annex A',
        circularUrl: CASE_RATE_2025_URL,
        packageName_fil: 'Case Rate para sa Type 2 diabetes with complications',
        packageName_en: 'Case Rate for Type 2 diabetes with complications',
        variantUsed_fil:
          'Variant used ngayon: Type 2 diabetes with complications (E11.2 / E11.5 / E11.6 / E11.7)',
        variantUsed_en:
          'Variant used now: Type 2 diabetes with complications (E11.2 / E11.5 / E11.6 / E11.7)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex A for Type 2 diabetes with covered complications at P24,570.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex A for Type 2 diabetes with covered complications at PHP 24,570.',
      },
      {
        key: 'coma_or_ketoacidosis',
        label_fil: 'Type 2 diabetes with coma o ketoacidosis',
        label_en: 'Type 2 diabetes with coma or ketoacidosis',
        desc_fil: 'May DKA, hyperosmolar state, o diabetes-related coma sa chart.',
        desc_en: 'With DKA, hyperosmolar state, or diabetes-related coma in the chart.',
        amount: 30810,
        circular: 'PhilHealth Circular 2024-0037 Annex A',
        circularUrl: CASE_RATE_2025_URL,
        packageName_fil: 'Case Rate para sa Type 2 diabetes with coma o ketoacidosis',
        packageName_en: 'Case Rate for Type 2 diabetes with coma or ketoacidosis',
        variantUsed_fil: 'Variant used ngayon: Type 2 diabetes with coma or ketoacidosis (E11.0 / E11.1)',
        variantUsed_en: 'Variant used now: Type 2 diabetes with coma or ketoacidosis (E11.0 / E11.1)',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0037 Annex A for Type 2 diabetes with coma or ketoacidosis (E11.0 / E11.1) at P30,810.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0037 Annex A for Type 2 diabetes with coma or ketoacidosis (E11.0 / E11.1) at PHP 30,810.',
      },
    ],
  },
  AMI: {
    title_fil: 'Anong treatment ang aktuwal na ginawa?',
    title_en: 'What treatment was actually done?',
    note_fil:
      'Ang AMI package ay naka-base sa actual intervention. Hindi sapat na "heart attack" lang ang label sa chart.',
    note_en:
      'The AMI package depends on the actual intervention. The chart needs more than just the label "heart attack."',
    defaultKey: 'pci',
    options: [
      {
        key: 'pci',
        label_fil: 'PCI / angioplasty',
        label_en: 'PCI / angioplasty',
        desc_fil: 'May coronary angioplasty o stent procedure na ginawa.',
        desc_en: 'A coronary angioplasty or stent procedure was performed.',
        amount: 524000,
        circular: 'PhilHealth Circular 2024-0032',
        circularUrl: AMI_URL,
        packageName_fil: 'Benefit Package para sa AMI - PCI / angioplasty',
        packageName_en: 'Benefit Package for AMI - PCI / angioplasty',
        variantUsed_fil: 'Variant used ngayon: PCI / angioplasty',
        variantUsed_en: 'Variant used now: PCI / angioplasty',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0032 for AMI treated with PCI / angioplasty at P524,000.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0032 for AMI treated with PCI / angioplasty at PHP 524,000.',
      },
      {
        key: 'fibrinolysis',
        label_fil: 'Fibrinolysis',
        label_en: 'Fibrinolysis',
        desc_fil: 'Clot-dissolving therapy ang ibinigay imbes na PCI.',
        desc_en: 'Clot-dissolving therapy was given instead of PCI.',
        amount: 133500,
        circular: 'PhilHealth Circular 2024-0032',
        circularUrl: AMI_URL,
        packageName_fil: 'Benefit Package para sa AMI - Fibrinolysis',
        packageName_en: 'Benefit Package for AMI - Fibrinolysis',
        variantUsed_fil: 'Variant used ngayon: Fibrinolysis',
        variantUsed_en: 'Variant used now: Fibrinolysis',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0032 for AMI treated with fibrinolysis at P133,500.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0032 for AMI treated with fibrinolysis at PHP 133,500.',
      },
      {
        key: 'ems_transfer',
        label_fil: 'Emergency medical services + transfer',
        label_en: 'Emergency medical services + transfer',
        desc_fil: 'EMS at transfer package ang ginamit habang inililipat ang pasyente.',
        desc_en: 'The EMS and transfer package applied while the patient was being transferred.',
        amount: 21900,
        circular: 'PhilHealth Circular 2024-0032',
        circularUrl: AMI_URL,
        packageName_fil: 'Benefit Package para sa AMI - Emergency medical services + transfer',
        packageName_en: 'Benefit Package for AMI - Emergency medical services + transfer',
        variantUsed_fil: 'Variant used ngayon: Emergency medical services + transfer',
        variantUsed_en: 'Variant used now: Emergency medical services + transfer',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0032 for AMI emergency medical services with transfer at P21,900.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0032 for AMI emergency medical services with transfer at PHP 21,900.',
      },
      {
        key: 'cardiac_rehab',
        label_fil: 'Cardiac rehabilitation',
        label_en: 'Cardiac rehabilitation',
        desc_fil: 'Post-PCI cardiac rehabilitation package ang binabayaran.',
        desc_en: 'The post-PCI cardiac rehabilitation package applies.',
        amount: 66140,
        circular: 'PhilHealth Circular 2024-0032',
        circularUrl: AMI_URL,
        packageName_fil: 'Benefit Package para sa AMI - Cardiac rehabilitation',
        packageName_en: 'Benefit Package for AMI - Cardiac rehabilitation',
        variantUsed_fil: 'Variant used ngayon: Cardiac rehabilitation',
        variantUsed_en: 'Variant used now: Cardiac rehabilitation',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2024-0032 for AMI cardiac rehabilitation at P66,140.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2024-0032 for AMI cardiac rehabilitation at PHP 66,140.',
      },
    ],
  },
  FRACTURE: {
    title_fil: 'Anong implant o procedure ang ginamit?',
    title_en: 'What implant or procedure was used?',
    note_fil:
      'Ang orthopedic package ay naka-base sa implant na aktuwal na ginamit sa surgery.',
    note_en:
      'The orthopedic package depends on the implant actually used during surgery.',
    defaultKey: 'intramedullary_nail',
    options: [
      {
        key: 'intramedullary_nail',
        label_fil: 'Intramedullary nail with interlocking screws',
        label_en: 'Intramedullary nail with interlocking screws',
        desc_fil: 'Karaniwang para sa selected femoral o tibial shaft fractures.',
        desc_en: 'Commonly used for selected femoral or tibial shaft fractures.',
        amount: 140000,
        circular: 'PhilHealth Circular 2023-0007 Revision 2',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Orthopedic implant package - intramedullary nail with interlocking screws',
        packageName_en: 'Orthopedic implant package - intramedullary nail with interlocking screws',
        variantUsed_fil: 'Variant used ngayon: Intramedullary nail with interlocking screws',
        variantUsed_en: 'Variant used now: Intramedullary nail with interlocking screws',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2023-0007 Revision 2 for selected femoral or tibial shaft fractures treated with intramedullary nail at P140,000.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2023-0007 Revision 2 for selected femoral or tibial shaft fractures treated with intramedullary nail at PHP 140,000.',
      },
      {
        key: 'locked_compression_plate',
        label_fil: 'Locked compression plate',
        label_en: 'Locked compression plate',
        desc_fil: 'Alternative implant package para sa selected femur o tibia fractures.',
        desc_en: 'Alternative implant package for selected femur or tibia fractures.',
        amount: 150000,
        circular: 'PhilHealth Circular 2023-0007 Revision 2',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Orthopedic implant package - locked compression plate',
        packageName_en: 'Orthopedic implant package - locked compression plate',
        variantUsed_fil: 'Variant used ngayon: Locked compression plate',
        variantUsed_en: 'Variant used now: Locked compression plate',
        sourceDetail_fil:
          'Source line: PhilHealth Circular 2023-0007 Revision 2 for selected femoral or tibial shaft fractures treated with locked compression plate at P150,000.',
        sourceDetail_en:
          'Source line: PhilHealth Circular 2023-0007 Revision 2 for selected femoral or tibial shaft fractures treated with locked compression plate at PHP 150,000.',
      },
    ],
  },
  CERVICAL_CANCER: {
    title_fil: 'Anong treatment pathway ang nasa plano?',
    title_en: 'Which treatment pathway is planned?',
    note_fil:
      'Ang cervical cancer Z-Benefit ay may magkaibang official amount depende sa surgery o radiation pathway.',
    note_en:
      'The cervical cancer Z-Benefit uses different official amounts depending on the surgery or radiation pathway.',
    defaultKey: 'primary_surgery_or_cobalt',
    options: [
      {
        key: 'primary_surgery_or_cobalt',
        label_fil: 'Primary surgery o cobalt with low-dose brachytherapy',
        label_en: 'Primary surgery or cobalt with low-dose brachytherapy',
        desc_fil: 'Para sa surgery pathway o cobalt-based chemoradiation plan.',
        desc_en: 'For the surgery pathway or a cobalt-based chemoradiation plan.',
        amount: 120000,
        circular: 'PhilHealth Benefits page',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Z-Benefit para sa Cervical Cancer - primary surgery o cobalt pathway',
        packageName_en: 'Z-Benefit for Cervical Cancer - primary surgery or cobalt pathway',
        variantUsed_fil: 'Variant used ngayon: Primary surgery o cobalt with low-dose brachytherapy',
        variantUsed_en: 'Variant used now: Primary surgery or cobalt with low-dose brachytherapy',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for cervical cancer primary surgery or cobalt with low-dose brachytherapy at P120,000.',
        sourceDetail_en:
          'Source line: PhilHealth Benefits page for cervical cancer primary surgery or cobalt with low-dose brachytherapy at PHP 120,000.',
      },
      {
        key: 'linear_accelerator',
        label_fil: 'Linear accelerator with high-dose brachytherapy',
        label_en: 'Linear accelerator with high-dose brachytherapy',
        desc_fil: 'Mas advanced radiation pathway gamit ang linear accelerator.',
        desc_en: 'More advanced radiation pathway using a linear accelerator.',
        amount: 175000,
        circular: 'PhilHealth Benefits page',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Z-Benefit para sa Cervical Cancer - linear accelerator pathway',
        packageName_en: 'Z-Benefit for Cervical Cancer - linear accelerator pathway',
        variantUsed_fil: 'Variant used ngayon: Linear accelerator with high-dose brachytherapy',
        variantUsed_en: 'Variant used now: Linear accelerator with high-dose brachytherapy',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for cervical cancer linear accelerator with high-dose brachytherapy at P175,000.',
        sourceDetail_en:
          'Source line: PhilHealth Benefits page for cervical cancer linear accelerator with high-dose brachytherapy at PHP 175,000.',
      },
    ],
  },
  KIDNEY_TRANSPLANT: {
    title_fil: 'Aling kidney transplant pathway ang nasa chart o treatment plan?',
    title_en: 'Which kidney transplant pathway is documented in the chart or treatment plan?',
    note_fil:
      'Mahalaga ito dahil magkaiba ang official PhilHealth amount depende sa donor type, immunosuppression regimen, at organ retrieval method.',
    note_en:
      'This matters because the official PhilHealth amount changes based on the donor type, immunosuppression regimen, and organ retrieval method.',
    defaultKey: 'living_open_basiliximab',
    options: [
      {
        key: 'living_open_basiliximab',
        label_fil: 'Living donor, open surgery, Basiliximab',
        label_en: 'Living donor, open surgery, Basiliximab',
        desc_fil: 'Open surgery para sa donor at recipient gamit ang Basiliximab pathway.',
        desc_en: 'Open surgery for both donor and recipient using the Basiliximab pathway.',
        amount: 865000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - living donor open surgery, Basiliximab',
        packageName_en: 'Kidney transplant Z-Benefit - living donor open surgery, Basiliximab',
        variantUsed_fil: 'Variant used ngayon: living donor open surgery, Basiliximab',
        variantUsed_en: 'Variant used now: living donor open surgery, Basiliximab',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - open surgery for both donor and recipient using Basiliximab at ₱865,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - open surgery for both donor and recipient using Basiliximab at PHP 865,000.',
      },
      {
        key: 'living_laparoscopic_basiliximab',
        label_fil: 'Living donor, laparoscopic donor surgery, Basiliximab',
        label_en: 'Living donor, laparoscopic donor surgery, Basiliximab',
        desc_fil: 'Laparoscopic donor surgery at open recipient surgery gamit ang Basiliximab.',
        desc_en: 'Laparoscopic donor surgery and open recipient surgery using Basiliximab.',
        amount: 993000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - living donor laparoscopic surgery, Basiliximab',
        packageName_en: 'Kidney transplant Z-Benefit - living donor laparoscopic surgery, Basiliximab',
        variantUsed_fil: 'Variant used ngayon: living donor laparoscopic donor surgery, Basiliximab',
        variantUsed_en: 'Variant used now: living donor laparoscopic donor surgery, Basiliximab',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - laparoscopic donor surgery and open recipient surgery using Basiliximab at ₱993,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - laparoscopic donor surgery and open recipient surgery using Basiliximab at PHP 993,000.',
      },
      {
        key: 'living_open_ratg',
        label_fil: 'Living donor, open surgery, rATG',
        label_en: 'Living donor, open surgery, rATG',
        desc_fil: 'Open surgery para sa donor at recipient gamit ang rATG pathway.',
        desc_en: 'Open surgery for both donor and recipient using the rATG pathway.',
        amount: 918000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - living donor open surgery, rATG',
        packageName_en: 'Kidney transplant Z-Benefit - living donor open surgery, rATG',
        variantUsed_fil: 'Variant used ngayon: living donor open surgery, rATG',
        variantUsed_en: 'Variant used now: living donor open surgery, rATG',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - open surgery for both donor and recipient using rATG at ₱918,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - open surgery for both donor and recipient using rATG at PHP 918,000.',
      },
      {
        key: 'living_laparoscopic_ratg',
        label_fil: 'Living donor, laparoscopic donor surgery, rATG',
        label_en: 'Living donor, laparoscopic donor surgery, rATG',
        desc_fil: 'Laparoscopic donor surgery at open recipient surgery gamit ang rATG.',
        desc_en: 'Laparoscopic donor surgery and open recipient surgery using rATG.',
        amount: 1045000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - living donor laparoscopic surgery, rATG',
        packageName_en: 'Kidney transplant Z-Benefit - living donor laparoscopic surgery, rATG',
        variantUsed_fil: 'Variant used ngayon: living donor laparoscopic donor surgery, rATG',
        variantUsed_en: 'Variant used now: living donor laparoscopic donor surgery, rATG',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - laparoscopic donor surgery and open recipient surgery using rATG at ₱1,045,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - laparoscopic donor surgery and open recipient surgery using rATG at PHP 1,045,000.',
      },
      {
        key: 'deceased_cold_basiliximab',
        label_fil: 'Deceased donor, cold storage, Basiliximab',
        label_en: 'Deceased donor, cold storage, Basiliximab',
        desc_fil: 'Deceased donor transplant na cold storage ang organ retrieval at Basiliximab ang regimen.',
        desc_en: 'Deceased donor transplant with cold-storage organ retrieval and the Basiliximab regimen.',
        amount: 1583000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - deceased donor cold storage, Basiliximab',
        packageName_en: 'Kidney transplant Z-Benefit - deceased donor cold storage, Basiliximab',
        variantUsed_fil: 'Variant used ngayon: deceased donor cold storage, Basiliximab',
        variantUsed_en: 'Variant used now: deceased donor cold storage, Basiliximab',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - deceased donor with cold-storage retrieval using Basiliximab at ₱1,583,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - deceased donor with cold-storage retrieval using Basiliximab at PHP 1,583,000.',
      },
      {
        key: 'deceased_machine_basiliximab',
        label_fil: 'Deceased donor, machine perfusion, Basiliximab',
        label_en: 'Deceased donor, machine perfusion, Basiliximab',
        desc_fil: 'Deceased donor transplant na machine perfusion ang organ retrieval at Basiliximab ang regimen.',
        desc_en: 'Deceased donor transplant with machine-perfusion organ retrieval and the Basiliximab regimen.',
        amount: 2093000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - deceased donor machine perfusion, Basiliximab',
        packageName_en: 'Kidney transplant Z-Benefit - deceased donor machine perfusion, Basiliximab',
        variantUsed_fil: 'Variant used ngayon: deceased donor machine perfusion, Basiliximab',
        variantUsed_en: 'Variant used now: deceased donor machine perfusion, Basiliximab',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - deceased donor with machine-perfusion retrieval using Basiliximab at ₱2,093,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - deceased donor with machine-perfusion retrieval using Basiliximab at PHP 2,093,000.',
      },
      {
        key: 'deceased_cold_ratg',
        label_fil: 'Deceased donor, cold storage, rATG',
        label_en: 'Deceased donor, cold storage, rATG',
        desc_fil: 'Deceased donor transplant na cold storage ang organ retrieval at rATG ang regimen.',
        desc_en: 'Deceased donor transplant with cold-storage organ retrieval and the rATG regimen.',
        amount: 1636000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - deceased donor cold storage, rATG',
        packageName_en: 'Kidney transplant Z-Benefit - deceased donor cold storage, rATG',
        variantUsed_fil: 'Variant used ngayon: deceased donor cold storage, rATG',
        variantUsed_en: 'Variant used now: deceased donor cold storage, rATG',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - deceased donor with cold-storage retrieval using rATG at ₱1,636,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - deceased donor with cold-storage retrieval using rATG at PHP 1,636,000.',
      },
      {
        key: 'deceased_machine_ratg',
        label_fil: 'Deceased donor, machine perfusion, rATG',
        label_en: 'Deceased donor, machine perfusion, rATG',
        desc_fil: 'Deceased donor transplant na machine perfusion ang organ retrieval at rATG ang regimen.',
        desc_en: 'Deceased donor transplant with machine-perfusion organ retrieval and the rATG regimen.',
        amount: 2146000,
        circular: 'PhilHealth Benefits page / Circular 2024-0035',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Kidney transplant Z-Benefit - deceased donor machine perfusion, rATG',
        packageName_en: 'Kidney transplant Z-Benefit - deceased donor machine perfusion, rATG',
        variantUsed_fil: 'Variant used ngayon: deceased donor machine perfusion, rATG',
        variantUsed_en: 'Variant used now: deceased donor machine perfusion, rATG',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for kidney transplantation - deceased donor with machine-perfusion retrieval using rATG at ₱2,146,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page lists kidney transplantation - deceased donor with machine-perfusion retrieval using rATG at PHP 2,146,000.',
      },
    ],
  },
  PERITONEAL_DIALYSIS: {
    title_fil: 'Aling peritoneal dialysis regimen ang ginagamit o naka-plan?',
    title_en: 'Which peritoneal dialysis regimen is being used or planned?',
    note_fil:
      'Magkaiba ang official PhilHealth amount depende sa adult o pediatric pathway at sa bilang ng bags kada araw.',
    note_en:
      'The official PhilHealth amount changes depending on the adult or pediatric pathway and the number of bags used per day.',
    defaultKey: 'adult_capd_3_bags',
    options: [
      {
        key: 'adult_capd_3_bags',
        label_fil: 'Adult CAPD, 3 bags/day',
        label_en: 'Adult CAPD, 3 bags/day',
        desc_fil: 'Adult CAPD regimen na may tatlong 2L bags bawat araw.',
        desc_en: 'Adult CAPD regimen using three 2L bags per day.',
        amount: 389640,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - adult CAPD, 3 bags/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - adult CAPD, 3 bags/day',
        variantUsed_fil: 'Variant used ngayon: adult CAPD, 3 bags/day',
        variantUsed_en: 'Variant used now: adult CAPD, 3 bags/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - adult CAPD requiring three 2L bags per day at ₱389,640.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows adult CAPD requiring three 2L bags per day at PHP 389,640.',
      },
      {
        key: 'adult_capd_4_bags',
        label_fil: 'Adult CAPD, 4 bags/day',
        label_en: 'Adult CAPD, 4 bags/day',
        desc_fil: 'Adult CAPD regimen na may apat na 2L bags bawat araw.',
        desc_en: 'Adult CAPD regimen using four 2L bags per day.',
        amount: 510140,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - adult CAPD, 4 bags/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - adult CAPD, 4 bags/day',
        variantUsed_fil: 'Variant used ngayon: adult CAPD, 4 bags/day',
        variantUsed_en: 'Variant used now: adult CAPD, 4 bags/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - adult CAPD requiring four 2L bags per day at ₱510,140.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows adult CAPD requiring four 2L bags per day at PHP 510,140.',
      },
      {
        key: 'pediatric_capd_4_bags',
        label_fil: 'Pediatric CAPD, 4 bags/day',
        label_en: 'Pediatric CAPD, 4 bags/day',
        desc_fil: 'Pediatric CAPD regimen na may apat na 2L bags bawat araw.',
        desc_en: 'Pediatric CAPD regimen using four 2L bags per day.',
        amount: 510140,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - pediatric CAPD, 4 bags/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - pediatric CAPD, 4 bags/day',
        variantUsed_fil: 'Variant used ngayon: pediatric CAPD, 4 bags/day',
        variantUsed_en: 'Variant used now: pediatric CAPD, 4 bags/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - pediatric CAPD requiring four 2L bags per day at ₱510,140.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows pediatric CAPD requiring four 2L bags per day at PHP 510,140.',
      },
      {
        key: 'pediatric_capd_5_bags',
        label_fil: 'Pediatric CAPD, 5 bags/day',
        label_en: 'Pediatric CAPD, 5 bags/day',
        desc_fil: 'Pediatric CAPD regimen na may limang 2L bags bawat araw.',
        desc_en: 'Pediatric CAPD regimen using five 2L bags per day.',
        amount: 637676,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - pediatric CAPD, 5 bags/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - pediatric CAPD, 5 bags/day',
        variantUsed_fil: 'Variant used ngayon: pediatric CAPD, 5 bags/day',
        variantUsed_en: 'Variant used now: pediatric CAPD, 5 bags/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - pediatric CAPD requiring five 2L bags per day at ₱637,676.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows pediatric CAPD requiring five 2L bags per day at PHP 637,676.',
      },
      {
        key: 'pediatric_capd_6_bags',
        label_fil: 'Pediatric CAPD, 6 bags/day',
        label_en: 'Pediatric CAPD, 6 bags/day',
        desc_fil: 'Pediatric CAPD regimen na may anim na 2L bags bawat araw.',
        desc_en: 'Pediatric CAPD regimen using six 2L bags per day.',
        amount: 765210,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - pediatric CAPD, 6 bags/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - pediatric CAPD, 6 bags/day',
        variantUsed_fil: 'Variant used ngayon: pediatric CAPD, 6 bags/day',
        variantUsed_en: 'Variant used now: pediatric CAPD, 6 bags/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - pediatric CAPD requiring six 2L bags per day at ₱765,210.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows pediatric CAPD requiring six 2L bags per day at PHP 765,210.',
      },
      {
        key: 'pediatric_apd_1_bag',
        label_fil: 'Pediatric APD, 1 bag na 5L/day',
        label_en: 'Pediatric APD, 1 bag of 5L/day',
        desc_fil: 'Pediatric APD regimen na may isang 5L bag bawat araw.',
        desc_en: 'Pediatric APD regimen using one 5L bag per day.',
        amount: 763000,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - pediatric APD, 1 bag/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - pediatric APD, 1 bag/day',
        variantUsed_fil: 'Variant used ngayon: pediatric APD, 1 bag na 5L/day',
        variantUsed_en: 'Variant used now: pediatric APD, 1 bag of 5L/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - pediatric APD requiring one 5L bag per day at ₱763,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows pediatric APD requiring one 5L bag per day at PHP 763,000.',
      },
      {
        key: 'pediatric_apd_2_bags',
        label_fil: 'Pediatric APD, 2 bags na 5L/day',
        label_en: 'Pediatric APD, 2 bags of 5L/day',
        desc_fil: 'Pediatric APD regimen na may dalawang 5L bags bawat araw.',
        desc_en: 'Pediatric APD regimen using two 5L bags per day.',
        amount: 1016000,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - pediatric APD, 2 bags/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - pediatric APD, 2 bags/day',
        variantUsed_fil: 'Variant used ngayon: pediatric APD, 2 bags na 5L/day',
        variantUsed_en: 'Variant used now: pediatric APD, 2 bags of 5L/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - pediatric APD requiring two 5L bags per day at ₱1,016,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows pediatric APD requiring two 5L bags per day at PHP 1,016,000.',
      },
      {
        key: 'pediatric_apd_3_bags',
        label_fil: 'Pediatric APD, 3 bags na 5L/day',
        label_en: 'Pediatric APD, 3 bags of 5L/day',
        desc_fil: 'Pediatric APD regimen na may tatlong 5L bags bawat araw.',
        desc_en: 'Pediatric APD regimen using three 5L bags per day.',
        amount: 1269000,
        circular: 'PhilHealth Benefits page / Circular 2024-0036',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Peritoneal dialysis Z-Benefit - pediatric APD, 3 bags/day',
        packageName_en: 'Peritoneal dialysis Z-Benefit - pediatric APD, 3 bags/day',
        variantUsed_fil: 'Variant used ngayon: pediatric APD, 3 bags na 5L/day',
        variantUsed_en: 'Variant used now: pediatric APD, 3 bags of 5L/day',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page peritoneal dialysis listing - pediatric APD requiring three 5L bags per day at ₱1,269,000.',
        sourceDetail_en:
          'Source line: The PhilHealth Benefits page peritoneal dialysis listing shows pediatric APD requiring three 5L bags per day at PHP 1,269,000.',
      },
    ],
  },
  MYOMECTOMY: {
    title_fil: 'Aling approach ang naka-document sa operative plan o chart?',
    title_en: 'Which approach is documented in the operative plan or chart?',
    note_fil:
      'Magkaiba ang official PhilHealth amount para sa abdominal at vaginal myomectomy. Kung hindi pa final ang operative note, gamitin muna ang plan ng surgeon at i-confirm bago discharge.',
    note_en:
      'PhilHealth uses different official amounts for abdominal and vaginal myomectomy. If the operative note is not final yet, start with the surgeon’s planned approach and confirm before discharge.',
    defaultKey: 'abdominal',
    options: [
      {
        key: 'abdominal',
        label_fil: 'Myomectomy, abdominal approach',
        label_en: 'Myomectomy, abdominal approach',
        desc_fil: 'Open abdominal operation para tanggalin ang uterine fibroids.',
        desc_en: 'Open abdominal operation to remove uterine fibroids.',
        amount: 45435,
        circular: 'PhilHealth Circular 2024-0037 Annex B',
        circularUrl: 'https://www.philhealth.gov.ph/circulars/2024/0037/AnnexB-ListofProcedureCaseRates.pdf',
        packageName_fil: 'Procedure Case Rate para sa Myomectomy (abdominal approach)',
        packageName_en: 'Procedure Case Rate for Myomectomy (abdominal approach)',
        variantUsed_fil: 'Variant used ngayon: myomectomy, abdominal approach (58140)',
        variantUsed_en: 'Variant used now: myomectomy, abdominal approach (58140)',
        sourceDetail_fil:
          'Source line: 58140 MYOMECTOMY, abdominal approach - P45,435 sa PhilHealth Circular 2024-0037 Annex B.',
        sourceDetail_en:
          'Source line: 58140 MYOMECTOMY, abdominal approach - PHP 45,435 in PhilHealth Circular 2024-0037 Annex B.',
      },
      {
        key: 'vaginal',
        label_fil: 'Myomectomy, vaginal approach',
        label_en: 'Myomectomy, vaginal approach',
        desc_fil: 'Vaginal approach para tanggalin ang fibroid na puwedeng abutin sa route na ito.',
        desc_en: 'Vaginal approach for a fibroid that can be reached through this route.',
        amount: 35100,
        circular: 'PhilHealth Circular 2024-0037 Annex B',
        circularUrl: 'https://www.philhealth.gov.ph/circulars/2024/0037/AnnexB-ListofProcedureCaseRates.pdf',
        packageName_fil: 'Procedure Case Rate para sa Myomectomy (vaginal approach)',
        packageName_en: 'Procedure Case Rate for Myomectomy (vaginal approach)',
        variantUsed_fil: 'Variant used ngayon: myomectomy, vaginal approach (58145)',
        variantUsed_en: 'Variant used now: myomectomy, vaginal approach (58145)',
        sourceDetail_fil:
          'Source line: 58145 MYOMECTOMY, vaginal approach - P35,100 sa PhilHealth Circular 2024-0037 Annex B.',
        sourceDetail_en:
          'Source line: 58145 MYOMECTOMY, vaginal approach - PHP 35,100 in PhilHealth Circular 2024-0037 Annex B.',
      },
    ],
  },
  OUTPATIENT_MENTAL_HEALTH: {
    title_fil: 'Aling outpatient mental health package ang ibibigay ng facility?',
    title_en: 'Which outpatient mental health package will the facility use?',
    note_fil:
      'Mahalaga ito dahil magkaiba ang annual package amount para sa General at Specialty mental health services.',
    note_en:
      'This matters because the annual package amount differs between the General and Specialty mental health services.',
    defaultKey: 'general',
    options: [
      {
        key: 'general',
        label_fil: 'General package',
        label_en: 'General package',
        desc_fil: 'Mas karaniwang outpatient package para sa standard psychiatric o neurologic follow-up.',
        desc_en: 'The more common outpatient package for standard psychiatric or neurologic follow-up.',
        amount: 9000,
        circular: 'PhilHealth Benefits page',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Outpatient Mental Health Services - General',
        packageName_en: 'Outpatient Mental Health Services - General',
        variantUsed_fil: 'Variant used ngayon: General outpatient mental health package',
        variantUsed_en: 'Variant used now: General outpatient mental health package',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for outpatient mental health services - General package at P9,000 per year.',
        sourceDetail_en:
          'Source line: PhilHealth Benefits page for outpatient mental health services - General package at PHP 9,000 per year.',
      },
      {
        key: 'specialty',
        label_fil: 'Specialty package',
        label_en: 'Specialty package',
        desc_fil: 'Mas mataas na annual package para sa specialty mental health management.',
        desc_en: 'Higher annual package for specialty mental health management.',
        amount: 16000,
        circular: 'PhilHealth Benefits page',
        circularUrl: BENEFITS_URL,
        packageName_fil: 'Outpatient Mental Health Services - Specialty',
        packageName_en: 'Outpatient Mental Health Services - Specialty',
        variantUsed_fil: 'Variant used ngayon: Specialty outpatient mental health package',
        variantUsed_en: 'Variant used now: Specialty outpatient mental health package',
        sourceDetail_fil:
          'Source line: PhilHealth Benefits page for outpatient mental health services - Specialty package at P16,000 per year.',
        sourceDetail_en:
          'Source line: PhilHealth Benefits page for outpatient mental health services - Specialty package at PHP 16,000 per year.',
      },
    ],
  },
};

export function getCoverageVariantConfig(conditionId) {
  return packageVariants[conditionId] ?? null;
}

export function getCoverageVariantOption(conditionId, variantKey) {
  const config = getCoverageVariantConfig(conditionId);
  if (!config) {
    return null;
  }

  return config.options.find((option) => option.key === variantKey) ?? null;
}

export function getDefaultCoverageVariantKey(conditionId) {
  const config = getCoverageVariantConfig(conditionId);
  return config?.defaultKey ?? '';
}
