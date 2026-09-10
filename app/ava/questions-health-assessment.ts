import type { Question } from './questions'

export const HEALTH_ASSESSMENT_QUESTIONS: Question[] = [
  // ─── CHAPTER 1: Components of Health Assessment ───────────────────────────

  {
    id: 'ha-ch1-q1',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'Which of the following is an example of subjective data collected during a health assessment?',
    options: [
      'A blood pressure reading of 148/92 mmHg',
      'The patient reports a throbbing headache rated 7/10',
      'The nurse observes bilateral pitting edema of the ankles',
      'A respiratory rate of 22 breaths per minute',
    ],
    answer: 1,
    explanation: 'Subjective data is what the patient reports feeling or experiencing — symptoms. A headache reported by the patient is subjective. Blood pressure, observed edema, and respiratory rate are all objective data (measurable/observable by the nurse).',
    term: 'Subjective data',
    definition: 'Information reported by the patient about their own feelings or experiences (symptoms); cannot be measured or observed by the nurse.',
  },
  {
    id: 'ha-ch1-q2',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: "A nurse documents that a patient's skin is jaundiced, the abdomen is distended, and the temperature is 38.9°C. These findings are classified as:",
    options: [
      'Symptoms',
      'Subjective data',
      'Signs',
      'Chief complaints',
    ],
    answer: 2,
    explanation: 'Signs are objective, measurable findings observed or measured by the healthcare provider. Jaundice, abdominal distension, and elevated temperature are all directly observable or measurable — they are signs, not symptoms.',
    term: 'Sign',
    definition: 'An objective, observable, or measurable finding detected by the nurse or other healthcare provider; also called objective data.',
  },
  {
    id: 'ha-ch1-q3',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'The nurse is caring for a new admission to the medical-surgical unit. Which type of health assessment is most appropriate for this patient?',
    options: [
      'Focused assessment',
      'Emergency assessment',
      'Comprehensive assessment',
      'Screening assessment',
    ],
    answer: 2,
    explanation: 'A comprehensive (complete head-to-toe) assessment is performed on new patients to establish a complete baseline. Focused assessments target a specific complaint, emergency assessments address life-threatening situations, and screening assessments detect disease in well populations.',
  },
  {
    id: 'ha-ch1-q4',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'A patient returns to the clinic two weeks after being treated for a urinary tract infection. The nurse performs an assessment specifically evaluating the patient\'s urinary symptoms and response to the prescribed antibiotic. This is an example of a:',
    options: [
      'Comprehensive assessment',
      'Follow-up assessment',
      'Screening assessment',
      'Emergency assessment',
    ],
    answer: 1,
    explanation: 'A follow-up assessment evaluates the patient\'s response to previous treatment and progress toward resolution of a known problem. It is distinct from a focused assessment (which addresses a new complaint) and a comprehensive assessment (full head-to-toe).',
    term: 'Follow-up assessment',
    definition: 'An assessment performed to evaluate a patient\'s response to previous treatment or progress toward resolving a previously identified problem.',
  },
  {
    id: 'ha-ch1-q5',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'Which step of the nursing process involves analyzing collected data to identify the patient\'s actual and potential health problems?',
    options: [
      'Assessment',
      'Planning',
      'Diagnosis',
      'Evaluation',
    ],
    answer: 2,
    explanation: 'The nursing process follows ADPIE: Assessment (data collection), Diagnosis (analyze data to identify problems), Planning (set goals/outcomes), Implementation (carry out interventions), Evaluation (evaluate goal achievement). Diagnosis is the step in which the nurse interprets collected data.',
  },
  {
    id: 'ha-ch1-q6',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'A community health nurse offers free blood glucose testing at a health fair for people with no known diabetes diagnosis. This activity represents which level of health promotion?',
    options: [
      'Primary prevention',
      'Secondary prevention',
      'Tertiary prevention',
      'Health maintenance',
    ],
    answer: 1,
    explanation: 'Secondary prevention focuses on early detection of disease in populations that may be at risk but are not yet diagnosed — such as screenings and mammograms. Blood glucose screening at a health fair exemplifies secondary prevention.',
    term: 'Secondary prevention',
    definition: 'Health promotion activities aimed at early detection and prompt treatment of disease in at-risk or asymptomatic individuals (e.g., screenings, mammograms, blood pressure checks).',
  },
  {
    id: 'ha-ch1-q7',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'A nurse is teaching a group of college students about hand hygiene and the importance of annual influenza vaccines to stay healthy. This represents which level of health promotion?',
    options: [
      'Secondary prevention',
      'Tertiary prevention',
      'Primary prevention',
      'Screening prevention',
    ],
    answer: 2,
    explanation: 'Primary prevention focuses on preventing disease before it occurs through education, immunizations, and lifestyle modifications. Teaching healthy students about vaccines and hand hygiene is primary prevention.',
    term: 'Primary prevention',
    definition: 'Health promotion activities that prevent disease or injury before it occurs (e.g., immunizations, health education, safety counseling).',
  },
  {
    id: 'ha-ch1-q8',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'Which of the following best describes the purpose of documentation in health assessment?',
    options: [
      'It is primarily used to justify nursing staff ratios',
      'It serves as a legal record, facilitates communication, and supports continuity of care',
      'It is only required when abnormal findings are present',
      'It is used exclusively for billing and reimbursement purposes',
    ],
    answer: 1,
    explanation: 'Documentation serves multiple critical purposes: it is a legal record of care provided, facilitates communication among the healthcare team, ensures continuity of care, supports research, and is used for billing. It must be completed regardless of whether findings are normal or abnormal.',
  },
  {
    id: 'ha-ch1-q9',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'According to Tanner\'s Clinical Judgment Model, which phase involves the nurse drawing on past clinical experiences to recognize what is significant in a patient situation?',
    options: [
      'Responding',
      'Reflecting',
      'Interpreting',
      'Noticing',
    ],
    answer: 3,
    explanation: 'In Tanner\'s model, "Noticing" is the initial phase where the nurse perceives what is significant in a patient situation — shaped by clinical experience. Interpreting involves understanding the meaning; Responding is taking action; Reflecting evaluates outcomes and refines future judgment.',
    term: 'Tanner\'s Clinical Judgment Model',
    definition: 'A four-part framework for clinical reasoning: Noticing (what catches attention based on experience), Interpreting (making sense of findings), Responding (acting on the interpretation), and Reflecting (evaluating the outcome to improve future judgment).',
  },
  {
    id: 'ha-ch1-q10',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'A nurse enrolled in a cardiac rehabilitation program helps a patient with heart failure learn to manage sodium intake, monitor daily weights, and recognize early signs of fluid overload. This is an example of:',
    options: [
      'Primary prevention',
      'Secondary prevention',
      'Tertiary prevention',
      'Comprehensive assessment',
    ],
    answer: 2,
    explanation: 'Tertiary prevention focuses on managing existing disease to prevent further complications and maximize function — such as cardiac rehab for a patient who already has heart failure. The goal is to slow disease progression and prevent readmission.',
    term: 'Tertiary prevention',
    definition: 'Health promotion aimed at managing existing disease, preventing complications, and maximizing functional ability in those already diagnosed (e.g., rehabilitation, disease management programs).',
  },
  {
    id: 'ha-ch1-q11',
    subject: 'health-assessment',
    chapter: 1,
    type: 'mc',
    question: 'The three major components of a complete health assessment include the health history, physical examination, and:',
    options: [
      'Nursing diagnosis',
      'Care planning',
      'Documentation and the health record',
      'Laboratory results',
    ],
    answer: 2,
    explanation: 'The three components of a complete health assessment are: (1) Health history — collects subjective data; (2) Physical examination — collects objective data; (3) Documentation/health record — records and communicates findings to the healthcare team.',
  },

  // TF Questions
  {
    id: 'ha-ch1-q12',
    subject: 'health-assessment',
    chapter: 1,
    type: 'tf',
    question: 'A symptom is an objective finding that can be observed or measured by the nurse.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False. A symptom is subjective data — what the patient reports experiencing (e.g., pain, nausea, dizziness). Objective findings that can be observed or measured by the nurse are called signs.',
  },
  {
    id: 'ha-ch1-q13',
    subject: 'health-assessment',
    chapter: 1,
    type: 'tf',
    question: 'An emergency assessment is a rapid, focused evaluation used specifically when a patient presents with a life-threatening condition.',
    options: ['True', 'False'],
    answer: 0,
    explanation: 'True. An emergency assessment is performed rapidly when a patient has a life-threatening situation (e.g., unresponsiveness, chest pain, severe trauma) to identify and immediately address threats to life.',
    term: 'Emergency assessment',
    definition: 'A rapid, abbreviated assessment performed when a patient presents with a potentially life-threatening condition; prioritizes airway, breathing, and circulation.',
  },
  {
    id: 'ha-ch1-q14',
    subject: 'health-assessment',
    chapter: 1,
    type: 'tf',
    question: 'In Tanner\'s Clinical Judgment Model, "Reflecting" is the first step in which the nurse decides which patient findings to pay attention to.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False. "Noticing" is the first step in Tanner\'s model — the phase in which the nurse perceives and recognizes significant findings in a clinical situation. "Reflecting" is the final phase, in which the nurse evaluates the outcome of the response and refines future clinical judgment.',
  },
  {
    id: 'ha-ch1-q15',
    subject: 'health-assessment',
    chapter: 1,
    type: 'tf',
    question: 'Health assessment data can be used for research, quality improvement, and healthcare billing, in addition to direct patient care.',
    options: ['True', 'False'],
    answer: 0,
    explanation: 'True. Documentation of health assessment data serves multiple purposes beyond direct patient care: it functions as a legal record, supports continuity of care and communication among providers, contributes to research and quality improvement, and is used for billing and reimbursement.',
  },

  // SATA Questions
  {
    id: 'ha-ch1-q16',
    subject: 'health-assessment',
    chapter: 1,
    type: 'sata',
    question: 'Select all that apply: Which of the following are examples of objective data (signs)?',
    options: [
      'Patient states "My chest feels tight"',
      'Heart rate of 112 beats per minute',
      'Patient reports feeling anxious',
      'Skin is pale and diaphoretic',
      'Temperature of 39.2°C',
      'Patient complains of dizziness',
    ],
    answers: [1, 3, 4],
    explanation: 'Objective data (signs) are findings the nurse can directly observe or measure: heart rate 112 bpm, pale/diaphoretic skin, and temperature 39.2°C are all objective. "Chest feels tight," "feeling anxious," and "dizziness" are all reported by the patient — making them subjective data (symptoms).',
  },
  {
    id: 'ha-ch1-q17',
    subject: 'health-assessment',
    chapter: 1,
    type: 'sata',
    question: 'Select all that apply: Which of the following statements accurately describe the five types of health assessments?',
    options: [
      'A comprehensive assessment is appropriate for all new patients to establish a baseline',
      'A focused assessment evaluates the patient\'s response to a previous treatment plan',
      'A screening assessment is performed on well populations to detect early disease',
      'An emergency assessment prioritizes rapid identification of life-threatening conditions',
      'A follow-up assessment addresses only a single new patient complaint',
    ],
    answers: [0, 2, 3],
    explanation: 'Comprehensive = new patients, full baseline; Screening = well populations, early detection; Emergency = rapid, life-threat focused. A follow-up assessment evaluates prior findings/treatment (not a new complaint) — that\'s the focused assessment\'s role. A focused assessment targets a specific complaint, not prior treatment.',
  },
  {
    id: 'ha-ch1-q18',
    subject: 'health-assessment',
    chapter: 1,
    type: 'sata',
    question: 'Select all that apply: Which of the following are accurate examples of primary prevention activities?',
    options: [
      'Administering an annual influenza vaccine to a healthy adult',
      'Teaching a newly diagnosed diabetic to monitor blood glucose',
      'Providing smoking cessation education to healthy college students',
      'Performing a colonoscopy on an asymptomatic 50-year-old',
      'Instructing school-age children about proper handwashing technique',
    ],
    answers: [0, 2, 4],
    explanation: 'Primary prevention prevents disease before it occurs: influenza vaccines, smoking cessation education for healthy people, and handwashing education all prevent disease onset. Teaching a diabetic to manage glucose is tertiary prevention (managing existing disease). Colonoscopy screening is secondary prevention (early detection).',
  },
  {
    id: 'ha-ch1-q19',
    subject: 'health-assessment',
    chapter: 1,
    type: 'sata',
    question: 'Select all that apply: Which of the following are components of Tanner\'s Clinical Judgment Model?',
    options: [
      'Noticing',
      'Assessing',
      'Interpreting',
      'Diagnosing',
      'Responding',
      'Reflecting',
    ],
    answers: [0, 2, 4, 5],
    explanation: 'Tanner\'s Clinical Judgment Model has four components: Noticing (perceiving significant cues), Interpreting (making sense of the data), Responding (taking clinical action), and Reflecting (evaluating outcomes to refine future judgment). Assessing and Diagnosing are steps in the nursing process, not Tanner\'s model.',
  },
  {
    id: 'ha-ch1-q20',
    subject: 'health-assessment',
    chapter: 1,
    type: 'sata',
    question: 'Select all that apply: Which of the following correctly describe the purpose of nursing documentation in health assessment?',
    options: [
      'Serves as a legal record of care provided',
      'Facilitates communication among the healthcare team',
      'Replaces verbal handoff report between nurses',
      'Supports research and quality improvement initiatives',
      'Ensures continuity of care across settings',
    ],
    answers: [0, 1, 3, 4],
    explanation: 'Documentation serves as a legal record, facilitates communication, supports research/QI, and ensures continuity of care. It does NOT replace verbal handoff — structured verbal handoffs (SBAR) complement written documentation but are separate communication activities.',
  },

  // Priority Questions
  {
    id: 'ha-ch1-q21',
    subject: 'health-assessment',
    chapter: 1,
    type: 'priority',
    question: 'The nurse is assigned four patients. Which patient should the nurse assess FIRST?',
    options: [
      'A 68-year-old post-op day 2 patient requesting pain medication rated 4/10',
      'A 45-year-old newly admitted patient with no documented baseline assessment',
      'A 72-year-old who is confused and attempting to climb out of bed',
      'A 55-year-old awaiting discharge teaching for a new diagnosis of hypertension',
    ],
    answer: 2,
    explanation: 'The confused patient attempting to climb out of bed poses an immediate safety risk (fall, injury). This is an emergency-level situation requiring immediate assessment and intervention. Safety takes priority over baseline documentation, pain management (stable 4/10), or discharge teaching.',
  },
  {
    id: 'ha-ch1-q22',
    subject: 'health-assessment',
    chapter: 1,
    type: 'priority',
    question: 'A nurse receives report on four patients. Which patient requires a priority EMERGENCY assessment?',
    options: [
      'A 60-year-old with chronic back pain requesting a heating pad',
      'A 50-year-old post-operative patient with mild incisional soreness',
      'A 38-year-old with new-onset slurred speech and right-sided facial drooping',
      'A 75-year-old with a known history of type 2 diabetes asking about meal timing',
    ],
    answer: 2,
    explanation: 'Sudden slurred speech and facial drooping are classic signs of a stroke (FAST: Face, Arms, Speech, Time). This is a life-threatening neurological emergency requiring immediate assessment. The other patients have stable, non-emergent concerns.',
  },
  {
    id: 'ha-ch1-q23',
    subject: 'health-assessment',
    chapter: 1,
    type: 'priority',
    question: 'In applying Tanner\'s Clinical Judgment Model, which action should the nurse perform FIRST when entering a patient\'s room and finding the patient pale, diaphoretic, and unresponsive to voice?',
    options: [
      'Document the findings in the electronic health record',
      'Call the provider to report abnormal findings',
      'Rapidly assess the patient\'s airway, breathing, and circulation',
      'Review the patient\'s medical history for prior similar episodes',
    ],
    answer: 2,
    explanation: 'The nurse\'s first action ("Responding" in Tanner\'s model) in a potentially life-threatening situation must be to assess ABCs — airway, breathing, circulation. This is the foundation of emergency assessment. Documentation and provider notification follow after the immediate clinical picture is established.',
  },
  {
    id: 'ha-ch1-q24',
    subject: 'health-assessment',
    chapter: 1,
    type: 'priority',
    question: 'The nursing student is preparing to conduct a health assessment on a new admission. Which action should be performed FIRST?',
    options: [
      'Auscultate the patient\'s lung sounds',
      'Ask the patient about their chief complaint',
      'Perform a head-to-toe physical examination',
      'Wash hands and gather necessary equipment',
    ],
    answer: 3,
    explanation: 'Hand hygiene and gathering equipment must be performed first, before any patient contact. This follows standard precautions and infection control principles. The physical examination and data collection follow after preparation.',
  },
  {
    id: 'ha-ch1-q25',
    subject: 'health-assessment',
    chapter: 1,
    type: 'priority',
    question: 'The nurse is reviewing the steps of the nursing process (ADPIE). Which step should be completed FIRST when caring for a new patient?',
    options: [
      'Diagnosis — identify nursing problems based on available data',
      'Planning — establish goals and expected outcomes',
      'Assessment — collect subjective and objective data',
      'Implementation — initiate nursing interventions',
    ],
    answer: 2,
    explanation: 'Assessment is always the first step of the nursing process (ADPIE). Without a complete data set, the nurse cannot accurately diagnose problems, plan care, or implement interventions. All subsequent steps depend on a thorough, accurate assessment.',
    term: 'ADPIE',
    definition: 'The five steps of the nursing process: Assessment, Diagnosis, Planning, Implementation, and Evaluation.',
  },

  // ─── CHAPTER 2: Health History Interview ──────────────────────────────────

  {
    id: 'ha-ch2-q1',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'During which phase of the health history interview does the nurse review the patient\'s medical record before entering the room?',
    options: [
      'Introduction phase',
      'Pre-interaction phase',
      'Working phase',
      'Termination phase',
    ],
    answer: 1,
    explanation: 'The pre-interaction phase occurs before the nurse meets the patient. During this phase, the nurse reviews the medical record, referral information, and any prior documentation to prepare for the interview. This allows the nurse to approach the patient with foundational knowledge.',
    term: 'Pre-interaction phase',
    definition: 'The phase of the health history interview that occurs before meeting the patient; the nurse reviews the medical record and prepares for data collection.',
  },
  {
    id: 'ha-ch2-q2',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'A nurse asks a patient, "Tell me about what brought you to the hospital today." This is an example of which type of interview question?',
    options: [
      'Closed-ended question',
      'Leading question',
      'Open-ended question',
      'Direct question',
    ],
    answer: 2,
    explanation: 'Open-ended questions invite the patient to describe their experience in their own words without limiting the response to yes or no. They elicit narrative and broader information. "Tell me about..." is a classic open-ended prompt. Closed-ended questions ask for specific facts or yes/no answers.',
    term: 'Open-ended question',
    definition: 'An interview question that invites a broad, narrative response from the patient, allowing them to describe their experience in their own words (e.g., "Tell me about your symptoms").',
  },
  {
    id: 'ha-ch2-q3',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'The nurse is interviewing a patient about chest pain and asks, "Does the pain get worse when you exert yourself?" This is an example of:',
    options: [
      'Open-ended questioning',
      'Facilitation technique',
      'Closed-ended questioning',
      'Summarizing',
    ],
    answer: 2,
    explanation: 'Closed-ended questions request specific information and can be answered with "yes," "no," or a brief factual response. They are useful for gathering precise data, particularly about specific symptoms. Open-ended questions encourage narrative responses.',
    term: 'Closed-ended question',
    definition: 'An interview question that can be answered with "yes," "no," or a specific brief response; useful for gathering precise data quickly.',
  },
  {
    id: 'ha-ch2-q4',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'Using the OLDCARTS mnemonic, when a patient reports chest pain, which component does the nurse address when asking, "Does the pain stay in one place or does it move anywhere?"',
    options: [
      'Onset',
      'Character',
      'Location/Radiation',
      'Timing',
    ],
    answer: 2,
    explanation: 'OLDCARTS = Onset, Location, Duration, Character, Aggravating/relieving factors, Radiation, Timing, Severity. Asking whether pain "stays in one place or moves" addresses both Location and Radiation — whether the pain radiates to other areas (e.g., jaw, left arm with cardiac pain).',
    term: 'OLDCARTS',
    definition: 'A mnemonic for symptom assessment: Onset, Location, Duration, Character, Aggravating/relieving factors, Radiation, Timing, Severity.',
  },
  {
    id: 'ha-ch2-q5',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'A patient begins to cry during the health history interview when discussing a recent family loss. The nurse\'s BEST therapeutic response is:',
    options: [
      '"Don\'t worry, things will get better soon."',
      '"Let\'s move on to your medical history so we can stay on schedule."',
      '"I can see this is very difficult for you. Take your time."',
      '"You shouldn\'t be so upset — this happens to a lot of people."',
    ],
    answer: 2,
    explanation: 'When a patient displays emotion, the therapeutic response is to acknowledge the feeling and allow the patient time. Saying "I can see this is very difficult" demonstrates empathy without minimizing the experience. "Don\'t worry, things will get better" is false reassurance, which is non-therapeutic. Redirecting and minimizing are also non-therapeutic.',
  },
  {
    id: 'ha-ch2-q6',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'During the health history interview, the patient asks the nurse, "Do you have any children?" The nurse\'s BEST response is:',
    options: [
      'Answer the question fully to build rapport with the patient',
      'Ignore the question and continue with the health history',
      'Professionally redirect: "This time is about you — tell me more about your concerns today"',
      'Excuse yourself from the room and ask another nurse to complete the interview',
    ],
    answer: 2,
    explanation: 'When patients ask personal questions, the nurse should deflect professionally — acknowledging the question while redirecting the focus back to the patient. This maintains professional boundaries while preserving therapeutic rapport. Fully answering or ignoring the question are both inappropriate.',
  },
  {
    id: 'ha-ch2-q7',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'Which phase of the health history interview involves summarizing the data collected and explaining next steps to the patient?',
    options: [
      'Pre-interaction phase',
      'Introduction phase',
      'Working phase',
      'Termination phase',
    ],
    answer: 3,
    explanation: 'The termination phase closes the interview. The nurse summarizes key findings, verifies accuracy with the patient, and explains what will happen next. This phase ensures the patient is informed and allows the patient to add or correct any information.',
    term: 'Termination phase',
    definition: 'The final phase of the health history interview in which the nurse summarizes data collected, verifies accuracy, and explains the next steps in care.',
  },
  {
    id: 'ha-ch2-q8',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'The nurse is collecting a family health history. Which statement about this component of the health history is most accurate?',
    options: [
      'Family history is only relevant for patients older than 65',
      'The family history should cover at least three generations to identify genetic risk patterns',
      'Only first-degree relatives (parents and siblings) need to be included',
      'Family history is less important than past surgical history',
    ],
    answer: 1,
    explanation: 'Family history should ideally span three generations (grandparents, parents, siblings, children) to identify patterns of hereditary conditions such as heart disease, diabetes, cancer, and hypertension. Genetic risk patterns may skip generations or appear differently across relatives.',
    term: 'Family health history',
    definition: 'A component of the health history documenting health conditions in biological relatives across at least three generations to identify hereditary and genetic risk factors.',
  },
  {
    id: 'ha-ch2-q9',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'The purpose of the review of systems (ROS) during a health history interview is to:',
    options: [
      'Replace the physical examination findings',
      'Perform a systematic check of all body systems to identify unreported symptoms',
      'Collect only data about the patient\'s chief complaint',
      'Document the nurse\'s physical examination findings',
    ],
    answer: 1,
    explanation: 'The review of systems is a systematic, head-to-toe verbal survey of all body systems. Its purpose is to uncover symptoms the patient may not have mentioned or may not realize are significant. It supplements the chief complaint and does not replace the physical examination.',
  },
  {
    id: 'ha-ch2-q10',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'At approximately what age do children typically begin to be able to provide their own health history information during an interview?',
    options: [
      'Ages 5–6 years',
      'Ages 8–9 years',
      'Ages 11–12 years',
      'Ages 15–16 years',
    ],
    answer: 2,
    explanation: 'Around ages 11–12, children typically develop the cognitive ability and communication skills to begin answering health history questions for themselves. Before this age, the primary caregiver is the main historian, though the child\'s own perspective should be included when possible.',
  },
  {
    id: 'ha-ch2-q11',
    subject: 'health-assessment',
    chapter: 2,
    type: 'mc',
    question: 'A nurse is interviewing a patient and notices they have not spoken for about 30 seconds. The nurse\'s BEST response is to:',
    options: [
      'Immediately ask another question to fill the silence',
      'Document that the patient is uncooperative',
      'Allow the silence to continue as it may be therapeutic',
      'Inform the patient that silence wastes time',
    ],
    answer: 2,
    explanation: 'Silence is a therapeutic communication technique. It gives the patient time to organize thoughts, process emotions, and communicate at their own pace. The nurse should allow silence rather than rushing to fill it. Filling every pause with a new question can interrupt the patient\'s thought process.',
  },

  // TF Questions
  {
    id: 'ha-ch2-q12',
    subject: 'health-assessment',
    chapter: 2,
    type: 'tf',
    question: 'Saying "Everything will be fine" to a patient who is anxious about surgery is an example of a therapeutic communication technique.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False. "Everything will be fine" is false reassurance — a non-therapeutic communication behavior. It dismisses the patient\'s feelings and provides a promise the nurse cannot guarantee. Therapeutic techniques include acknowledging feelings, active listening, and clarification.',
  },
  {
    id: 'ha-ch2-q13',
    subject: 'health-assessment',
    chapter: 2,
    type: 'tf',
    question: 'The working phase of the health history interview is when the nurse establishes rapport and explains the purpose of the interview to the patient.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False. Establishing rapport and explaining the purpose of the interview occurs during the introduction phase. The working phase is where the bulk of data collection takes place — the nurse gathers subjective data about the patient\'s health history.',
    term: 'Introduction phase',
    definition: 'The second phase of the health history interview in which the nurse introduces themselves, establishes rapport, and explains the purpose and structure of the interview.',
  },
  {
    id: 'ha-ch2-q14',
    subject: 'health-assessment',
    chapter: 2,
    type: 'tf',
    question: 'Cultural competence is an important component of patient-centered interviewing because cultural beliefs can significantly influence a patient\'s health perceptions and behaviors.',
    options: ['True', 'False'],
    answer: 0,
    explanation: 'True. Cultural competence requires the nurse to recognize and respect how a patient\'s cultural background shapes their beliefs about health, illness, treatment, and communication. A culturally competent approach improves the therapeutic relationship and the accuracy of data collected.',
  },
  {
    id: 'ha-ch2-q15',
    subject: 'health-assessment',
    chapter: 2,
    type: 'tf',
    question: 'The personal/psychosocial history component of the health history does NOT include questions about substance use or mental health.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False. The personal/psychosocial history is a comprehensive component that includes self-concept, diet and activity patterns, functional ability (ADLs), mental health, substance use (tobacco, alcohol, recreational drugs), and environmental concerns. These factors are critical to holistic patient assessment.',
  },

  // SATA Questions
  {
    id: 'ha-ch2-q16',
    subject: 'health-assessment',
    chapter: 2,
    type: 'sata',
    question: 'Select all that apply: Which of the following are therapeutic communication techniques that ENHANCE data collection during a health history interview?',
    options: [
      'Active listening',
      'Giving unsolicited advice',
      'Reflection',
      'Using medical jargon',
      'Clarification',
      'Summarizing',
    ],
    answers: [0, 2, 4, 5],
    explanation: 'Therapeutic techniques that enhance data collection: active listening (full attention), reflection (repeating key words), clarification (asking for more detail), and summarizing (recapping to verify understanding). Giving unsolicited advice and using jargon are non-therapeutic barriers to communication.',
  },
  {
    id: 'ha-ch2-q17',
    subject: 'health-assessment',
    chapter: 2,
    type: 'sata',
    question: 'Select all that apply: Which of the following behaviors INTERFERE with effective communication during a health history interview?',
    options: [
      'Interrupting the patient mid-sentence to ask a new question',
      'Using silence to allow the patient time to gather thoughts',
      'Changing the subject when the patient becomes emotional',
      'Using medical terminology the patient may not understand',
      'Providing false reassurance ("You\'ll be fine")',
    ],
    answers: [0, 2, 3, 4],
    explanation: 'Non-therapeutic behaviors: interrupting (disrupts patient\'s train of thought), changing the subject when emotion arises (avoids therapeutic connection), using jargon (creates confusion), and false reassurance (dismisses concern). Silence is therapeutic — it allows processing time.',
  },
  {
    id: 'ha-ch2-q18',
    subject: 'health-assessment',
    chapter: 2,
    type: 'sata',
    question: 'Select all that apply: Which of the following are components of the personal/psychosocial history in a complete health history?',
    options: [
      'Self-concept and body image',
      'Current medications and dosages',
      'Dietary habits and physical activity patterns',
      'Functional ability and ability to perform ADLs',
      'Substance use (tobacco, alcohol, recreational drugs)',
      'Previous surgical history',
    ],
    answers: [0, 2, 3, 4],
    explanation: 'The personal/psychosocial history covers self-concept, diet/activity, functional ability/ADLs, mental health, substance use, and environmental concerns. Current medications belong to the "present health status" component; surgical history is part of "past health status."',
  },
  {
    id: 'ha-ch2-q19',
    subject: 'health-assessment',
    chapter: 2,
    type: 'sata',
    question: 'Select all that apply: Which of the following correctly describe the four phases of the health history interview?',
    options: [
      'Pre-interaction: review chart and prepare before meeting the patient',
      'Introduction: begin physical examination and vital sign collection',
      'Working phase: gather subjective data through therapeutic communication',
      'Termination: summarize findings and explain next steps to the patient',
      'Introduction: establish rapport and explain the interview\'s purpose',
    ],
    answers: [0, 2, 3, 4],
    explanation: 'Correct: Pre-interaction = review chart; Working = gather subjective data; Termination = summarize/close; Introduction = establish rapport and explain purpose. Physical examination does NOT occur during the introduction phase — that phase is purely for establishing the therapeutic relationship and interview structure.',
  },
  {
    id: 'ha-ch2-q20',
    subject: 'health-assessment',
    chapter: 2,
    type: 'sata',
    question: 'Select all that apply: Which of the following are components typically included in the "present health status" section of a health history?',
    options: [
      'Chief complaint (reason for seeking care)',
      'Current medications, including OTC drugs and supplements',
      'Known allergies and type of reaction',
      'Family history of heart disease and diabetes',
      'Previous hospitalizations and surgeries',
    ],
    answers: [0, 1, 2],
    explanation: 'Present health status covers: chief complaint (current concern), current medications (prescription, OTC, supplements), and allergies (substance and type of reaction). Family history and previous hospitalizations/surgeries are separate components of the past health history.',
  },

  // Priority Questions
  {
    id: 'ha-ch2-q21',
    subject: 'health-assessment',
    chapter: 2,
    type: 'priority',
    question: 'The nurse is beginning a health history interview with a new patient. Which action should the nurse perform FIRST?',
    options: [
      'Ask the patient to describe their chief complaint in detail',
      'Introduce yourself, explain the purpose of the interview, and ensure the patient\'s privacy',
      'Begin the review of systems to screen for unreported symptoms',
      'Ask about the patient\'s family history of chronic illness',
    ],
    answer: 1,
    explanation: 'The introduction phase comes first — the nurse introduces themselves, establishes rapport, explains the interview\'s purpose, and ensures privacy (closing the door, sitting at eye level). Without this foundation, data collection cannot proceed therapeutically. The chief complaint and other history components follow after rapport is established.',
  },
  {
    id: 'ha-ch2-q22',
    subject: 'health-assessment',
    chapter: 2,
    type: 'priority',
    question: 'A patient is describing their current symptoms when they suddenly begin talking extensively about unrelated topics, making it difficult to complete the health history. Which action should the nurse take FIRST?',
    options: [
      'Allow the patient to continue speaking without interruption for as long as needed',
      'Document that the patient is non-compliant with the interview',
      'Gently redirect: "That\'s helpful context. Let\'s get back to your main concern today"',
      'Terminate the interview and reschedule for another time',
    ],
    answer: 2,
    explanation: 'When a patient is overly talkative or tangential, the nurse should gently redirect without being dismissive. Acknowledging what was said and refocusing on the primary concern maintains the therapeutic relationship while ensuring data collection is complete and efficient.',
  },
  {
    id: 'ha-ch2-q23',
    subject: 'health-assessment',
    chapter: 2,
    type: 'priority',
    question: 'Using OLDCARTS to assess a patient\'s abdominal pain, which question should the nurse ask FIRST?',
    options: [
      '"On a scale of 0–10, how would you rate your pain right now?"',
      '"Does anything make the pain better or worse?"',
      '"When did the pain start, and did it come on suddenly or gradually?"',
      '"Does the pain go anywhere else, like your back or shoulder?"',
    ],
    answer: 2,
    explanation: 'OLDCARTS begins with Onset — when and how the symptom began. This establishes the temporal framework for the symptom and guides subsequent questions. Severity (scale), aggravating/relieving factors, and radiation are assessed after onset is established.',
  },
  {
    id: 'ha-ch2-q24',
    subject: 'health-assessment',
    chapter: 2,
    type: 'priority',
    question: 'The nurse completes a health history interview and is preparing to end the conversation. Which action should the nurse perform FIRST during the termination phase?',
    options: [
      'Begin the physical examination immediately',
      'Leave the room to document findings in the electronic health record',
      'Summarize the key information collected and ask the patient to verify its accuracy',
      'Ask the patient additional open-ended questions about their lifestyle',
    ],
    answer: 2,
    explanation: 'The first action in the termination phase is to summarize the collected data and verify accuracy with the patient. This ensures completeness, corrects any misunderstandings, and validates the information before the nurse proceeds to documentation and physical examination.',
  },
  {
    id: 'ha-ch2-q25',
    subject: 'health-assessment',
    chapter: 2,
    type: 'priority',
    question: 'During a health history interview, which patient statement should the nurse follow up on FIRST?',
    options: [
      '"I try to walk for 30 minutes most days."',
      '"I take a daily multivitamin with breakfast."',
      '"I\'ve been having chest pain that wakes me up at night for the past week."',
      '"My last physical exam was about a year ago."',
    ],
    answer: 2,
    explanation: 'Nocturnal chest pain is a potentially serious cardiac or pulmonary symptom that requires immediate follow-up. This should be fully explored with OLDCARTS before moving to other health history components. The other statements are routine and do not suggest an urgent health concern.',
  },

  // ─── CHAPTER 3: Physical Assessment Techniques ────────────────────────────

  {
    id: 'ha-ch3-q1',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'The nurse is preparing to assess a patient\'s abdomen. In which order should the four assessment techniques be performed?',
    options: [
      'Inspection → Palpation → Percussion → Auscultation',
      'Inspection → Auscultation → Percussion → Palpation',
      'Auscultation → Inspection → Palpation → Percussion',
      'Palpation → Percussion → Auscultation → Inspection',
    ],
    answer: 1,
    explanation: 'For the abdomen ONLY, the order is Inspection → Auscultation → Percussion → Palpation. Auscultation is performed before percussion and palpation because palpating or percussing the abdomen can alter bowel sounds, producing inaccurate findings. For all other body systems, the standard order is Inspection → Palpation → Percussion → Auscultation.',
    term: 'Abdominal assessment order',
    definition: 'The unique assessment sequence for the abdomen: Inspection → Auscultation → Percussion → Palpation; auscultation precedes palpation/percussion to avoid altering bowel sounds.',
  },
  {
    id: 'ha-ch3-q2',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'When using a stethoscope to assess heart sounds, the nurse should use the BELL of the stethoscope to best detect:',
    options: [
      'Normal S1 and S2 heart sounds',
      'High-pitched breath sounds',
      'Low-pitched heart murmurs and S3/S4 sounds',
      'Normal bowel sounds',
    ],
    answer: 2,
    explanation: 'The bell of the stethoscope detects low-pitched sounds — including S3 and S4 heart sounds, heart murmurs, and bruits. The diaphragm detects high-pitched sounds such as normal S1/S2, bowel sounds, and normal breath sounds (vesicular, bronchial, bronchovesicular).',
    term: 'Bell (stethoscope)',
    definition: 'The concave, cupped side of the stethoscope head used to detect low-pitched sounds such as S3, S4, murmurs, and bruits.',
  },
  {
    id: 'ha-ch3-q3',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'When assessing blood pressure, the nurse selects a cuff that is too small for the patient\'s arm circumference. What effect will this have on the blood pressure reading?',
    options: [
      'The reading will be falsely low',
      'The reading will be accurate',
      'The reading will be falsely high',
      'The reading will vary randomly',
    ],
    answer: 2,
    explanation: 'A blood pressure cuff that is too small for the arm will produce a falsely elevated (high) reading. The cuff width should be approximately 40% of the arm circumference, and the bladder should encircle at least 80% of the upper arm. A cuff that is too large may produce a falsely low reading.',
    term: 'BP cuff sizing',
    definition: 'Proper BP cuff selection: width = ~40% of arm circumference; bladder encircles ≥80% of upper arm. Too-small cuff → falsely HIGH reading; too-large cuff → falsely low reading.',
  },
  {
    id: 'ha-ch3-q4',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'The nurse percusses the patient\'s right lower lung field and notes a dull sound. This percussion note most likely indicates:',
    options: [
      'Normal air-filled lung tissue',
      'Hyperinflation from emphysema',
      'Fluid or consolidation in the lung (e.g., pneumonia, pleural effusion)',
      'Air in the stomach',
    ],
    answer: 2,
    explanation: 'Dullness on percussion indicates a fluid-filled or solid structure — such as consolidation (pneumonia), pleural effusion, or atelectasis. Normal lung tissue produces resonance; hyperinflation (emphysema) produces hyperresonance; tympany (drum-like) is heard over air-filled organs like the stomach.',
    term: 'Percussion sounds',
    definition: 'Tympany = air-filled hollow organ (stomach); Resonance = normal air-filled lung; Hyperresonance = emphysema/pneumothorax; Dullness = fluid/solid (liver, consolidation); Flatness = bone/dense muscle.',
  },
  {
    id: 'ha-ch3-q5',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'A patient\'s peripheral oxygen saturation (SpO₂) reads 91% on the pulse oximeter. The nurse notes the patient has dark nail polish applied. What is the nurse\'s BEST next action?',
    options: [
      'Document SpO₂ as 91% and continue monitoring',
      'Remove the nail polish or reposition the probe to an alternate site and reassess',
      'Administer supplemental oxygen immediately based on the current reading',
      'Notify the provider that the patient is hypoxic',
    ],
    answer: 1,
    explanation: 'Nail polish (especially dark or metallic shades) can interfere with pulse oximetry accuracy. The nurse should remove the polish or move the probe to an alternate site (earlobe, forehead, toe) before acting on the reading. Other sources of inaccurate SpO₂ include poor peripheral circulation, carbon monoxide poisoning, and severe anemia.',
  },
  {
    id: 'ha-ch3-q6',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'Standard precautions are used during patient care because:',
    options: [
      'Only patients with known infections require standard precautions',
      'Standard precautions apply to all patients regardless of diagnosis, assuming all body fluids are potentially infectious',
      'Standard precautions are only required when performing invasive procedures',
      'Standard precautions are optional when the patient is cooperative and appears clean',
    ],
    answer: 1,
    explanation: 'Standard precautions are applied to ALL patients regardless of their known or suspected diagnosis. They are based on the principle that all blood and body fluids may be infectious. This prevents disease transmission in both directions — protecting both patients and healthcare workers.',
    term: 'Standard precautions',
    definition: 'Infection control practices applied to all patients regardless of diagnosis, based on the assumption that all blood and body fluids are potentially infectious; include hand hygiene, PPE, and safe sharps handling.',
  },
  {
    id: 'ha-ch3-q7',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'The nurse is testing a patient\'s near visual acuity. Which tool is appropriate for this assessment?',
    options: [
      'Snellen chart at 20 feet',
      'Jaeger card at 14 inches',
      'Ophthalmoscope',
      'Tonometer',
    ],
    answer: 1,
    explanation: 'Near visual acuity is tested with a Jaeger card held at 14 inches (36 cm). The Snellen chart tests far (distance) visual acuity at 20 feet. The ophthalmoscope examines internal eye structures; the tonometer measures intraocular pressure.',
    term: 'Jaeger card',
    definition: 'A handheld card used to assess near visual acuity; held approximately 14 inches (36 cm) from the eyes.',
  },
  {
    id: 'ha-ch3-q8',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'When performing deep palpation, the nurse should apply pressure to a depth of approximately:',
    options: [
      '1 cm, to assess for superficial tenderness',
      '2–3 cm, for routine abdominal assessment',
      '4–5 cm, to assess organ size and detect deep masses',
      '6–7 cm, for assessing the retroperitoneal space',
    ],
    answer: 2,
    explanation: 'Deep palpation reaches a depth of 4–5 cm and is used to assess organ size, position, and deep masses. Light palpation (1 cm depth) is used first to assess for superficial tenderness, muscle guarding, and general survey. Deep palpation should never be performed over tender areas first.',
  },
  {
    id: 'ha-ch3-q9',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'The nurse is assessing a patient with chronic obstructive pulmonary disease (COPD). Which percussion sound would the nurse MOST likely hear over the patient\'s lung fields?',
    options: [
      'Dullness',
      'Flatness',
      'Tympany',
      'Hyperresonance',
    ],
    answer: 3,
    explanation: 'Hyperresonance is heard over hyperinflated lung tissue, which is characteristic of emphysema and COPD. The air trapping in COPD causes the lungs to be over-distended, producing a louder, lower-pitched percussion note than normal resonance. Dullness indicates fluid or consolidation; tympany is heard over hollow air-filled organs.',
  },
  {
    id: 'ha-ch3-q10',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'The nurse is obtaining a blood pressure using an automated sphygmomanometer. Which limitation is MOST important to recognize when using this device?',
    options: [
      'It cannot be used on elderly patients',
      'It may be inaccurate in patients with arrhythmias, hypotension, or hypertensive extremes',
      'It always reads higher than manual measurements',
      'It is only appropriate for patients with normal weight',
    ],
    answer: 1,
    explanation: 'Automated blood pressure devices may produce inaccurate readings in patients with irregular heart rhythms (arrhythmias), very low blood pressure (hypotension), or extremely high blood pressure (hypertensive extremes). In these situations, manual auscultation with a stethoscope is more reliable.',
  },
  {
    id: 'ha-ch3-q11',
    subject: 'health-assessment',
    chapter: 3,
    type: 'mc',
    question: 'The nurse is using indirect percussion technique. Which of the following correctly describes the proper method?',
    options: [
      'Strike the body surface directly with the fingertip',
      'Place the middle finger of the non-dominant hand flat on the skin; strike its distal joint with the middle finger of the dominant hand',
      'Use a reflex hammer to tap the chest wall at rib intervals',
      'Press both palms flat on the skin surface and vibrate rapidly',
    ],
    answer: 1,
    explanation: 'Indirect percussion: the middle finger (pleximeter) of the non-dominant hand is placed flat on the skin surface, and the tip of the middle finger of the dominant hand (plexor) strikes the distal joint of the pleximeter. This is the most common percussion technique used in assessment. Direct percussion involves tapping the body surface directly.',
    term: 'Indirect percussion',
    definition: 'The most common percussion technique: the middle finger of the non-dominant hand (pleximeter) is placed on the skin and struck at its distal joint by the middle finger of the dominant hand (plexor).',
  },

  // TF Questions
  {
    id: 'ha-ch3-q12',
    subject: 'health-assessment',
    chapter: 3,
    type: 'tf',
    question: 'The diaphragm of the stethoscope is used to best hear low-pitched sounds such as S3 heart sounds and bruits.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False. The BELL of the stethoscope detects low-pitched sounds such as S3, S4, murmurs, and bruits. The DIAPHRAGM detects high-pitched sounds including normal S1/S2, bowel sounds, and normal breath sounds. Confusing the two is a common error in auscultation.',
  },
  {
    id: 'ha-ch3-q13',
    subject: 'health-assessment',
    chapter: 3,
    type: 'tf',
    question: 'A tympanic thermometer reading may be affected by the presence of cerumen (earwax) in the ear canal.',
    options: ['True', 'False'],
    answer: 0,
    explanation: 'True. Tympanic (ear) thermometers measure infrared radiation from the tympanic membrane and can be affected by cerumen buildup, otitis media, or improper probe positioning in the ear canal. Cerumen can block the infrared sensor, leading to inaccurate (falsely low) readings.',
    term: 'Tympanic thermometer',
    definition: 'A thermometer that measures infrared radiation from the tympanic membrane; accuracy may be affected by cerumen buildup, ear infection, or improper positioning.',
  },
  {
    id: 'ha-ch3-q14',
    subject: 'health-assessment',
    chapter: 3,
    type: 'tf',
    question: 'The Snellen chart is used to assess far (distance) visual acuity and is positioned at 20 feet from the patient.',
    options: ['True', 'False'],
    answer: 0,
    explanation: 'True. The Snellen chart tests far visual acuity at a standardized distance of 20 feet. Normal vision is documented as 20/20. Near visual acuity is tested separately using a Jaeger card held at 14 inches.',
    term: 'Snellen chart',
    definition: 'A standardized eye chart used to assess far (distance) visual acuity; positioned 20 feet from the patient; normal result is 20/20.',
  },
  {
    id: 'ha-ch3-q15',
    subject: 'health-assessment',
    chapter: 3,
    type: 'tf',
    question: 'Pulse oximetry provides an accurate oxygen saturation measurement in a patient with carbon monoxide poisoning because it measures all forms of hemoglobin.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False. Standard pulse oximetry CANNOT distinguish between oxyhemoglobin and carboxyhemoglobin (hemoglobin bound to carbon monoxide). In CO poisoning, the SpO₂ reading appears falsely normal or even elevated while the patient is actually hypoxic. Co-oximetry (arterial blood gas) is required for accurate measurement in CO poisoning.',
  },

  // SATA Questions
  {
    id: 'ha-ch3-q16',
    subject: 'health-assessment',
    chapter: 3,
    type: 'sata',
    question: 'Select all that apply: Which of the following conditions or factors can cause INACCURATE pulse oximetry (SpO₂) readings?',
    options: [
      'Nail polish on the finger',
      'Fever greater than 38°C',
      'Poor peripheral circulation (vasoconstriction)',
      'Carbon monoxide poisoning',
      'Severe anemia',
      'Normal respiratory rate',
    ],
    answers: [0, 2, 3, 4],
    explanation: 'Factors that cause inaccurate SpO₂: nail polish (blocks light transmission), poor peripheral circulation/vasoconstriction (inadequate perfusion to sensor site), carbon monoxide poisoning (CO binds hemoglobin but reads as O₂), and severe anemia (insufficient hemoglobin for accurate signal). Fever and normal respiratory rate do not significantly affect SpO₂ accuracy.',
  },
  {
    id: 'ha-ch3-q17',
    subject: 'health-assessment',
    chapter: 3,
    type: 'sata',
    question: 'Select all that apply: Which of the following percussion sounds are correctly matched to their associated clinical finding?',
    options: [
      'Tympany — air-filled stomach or intestine',
      'Resonance — normal air-filled lung tissue',
      'Dullness — healthy lung tissue',
      'Hyperresonance — emphysema or pneumothorax',
      'Flatness — bone or dense muscle',
    ],
    answers: [0, 1, 3, 4],
    explanation: 'Correct matches: Tympany = hollow air-filled organs (stomach, bowel); Resonance = normal lung; Hyperresonance = emphysema/pneumothorax (over-inflated); Flatness = bone or dense muscle. Dullness is heard over fluid or solid structures (liver, consolidation) — NOT healthy lung tissue.',
  },
  {
    id: 'ha-ch3-q18',
    subject: 'health-assessment',
    chapter: 3,
    type: 'sata',
    question: 'Select all that apply: Which of the following are appropriate alternate sites for pulse oximeter probe placement when the fingertip cannot be used?',
    options: [
      'Earlobe',
      'Toe',
      'Forehead',
      'Wrist',
      'Sternum',
    ],
    answers: [0, 1, 2],
    explanation: 'Approved alternate pulse oximetry sites include the earlobe, toe, and forehead (reflectance sensors). These sites have sufficient capillary perfusion for accurate readings. The wrist and sternum are not standard pulse oximetry sites.',
  },
  {
    id: 'ha-ch3-q19',
    subject: 'health-assessment',
    chapter: 3,
    type: 'sata',
    question: 'Select all that apply: Which of the following sounds are BEST assessed using the diaphragm of the stethoscope?',
    options: [
      'Normal S1 and S2 heart sounds',
      'S3 heart sound (ventricular gallop)',
      'Normal vesicular breath sounds',
      'Bruits over the carotid artery',
      'Bowel sounds',
    ],
    answers: [0, 2, 4],
    explanation: 'The diaphragm detects high-pitched sounds: normal S1/S2, normal breath sounds (vesicular, bronchovesicular, bronchial), and bowel sounds. The bell detects low-pitched sounds: S3, S4, murmurs, and bruits. Using the diaphragm for low-pitched sounds will diminish or miss them entirely.',
  },
  {
    id: 'ha-ch3-q20',
    subject: 'health-assessment',
    chapter: 3,
    type: 'sata',
    question: 'Select all that apply: Which of the following are correct principles of palpation technique during physical assessment?',
    options: [
      'Light palpation should always be performed before deep palpation',
      'Deep palpation should be performed first to locate areas of maximum tenderness',
      'Light palpation reaches approximately 1 cm in depth',
      'Deep palpation can reach 4–5 cm in depth to assess organ size',
      'Palpation should never begin directly over an area the patient has identified as tender',
    ],
    answers: [0, 2, 3, 4],
    explanation: 'Correct palpation principles: light palpation (1 cm) always precedes deep palpation (4–5 cm); palpation should NOT begin over tender areas (this causes guarding and patient discomfort); deep palpation assesses organ size and masses. Starting with deep palpation first or palpating tender areas first are both incorrect techniques.',
  },

  // Priority Questions
  {
    id: 'ha-ch3-q21',
    subject: 'health-assessment',
    chapter: 3,
    type: 'priority',
    question: 'The nurse is preparing to perform a physical assessment. Which action should be performed FIRST before beginning?',
    options: [
      'Gather all necessary assessment equipment',
      'Perform hand hygiene',
      'Position the patient in a supine position',
      'Explain the procedure to the patient',
    ],
    answer: 1,
    explanation: 'Hand hygiene is always the first action before any patient contact — before gathering equipment, positioning, or explaining. This is a fundamental principle of standard precautions and infection control. It protects both the patient and the nurse.',
  },
  {
    id: 'ha-ch3-q22',
    subject: 'health-assessment',
    chapter: 3,
    type: 'priority',
    question: 'The nurse is preparing to measure a patient\'s blood pressure manually. Which action should the nurse take FIRST?',
    options: [
      'Inflate the cuff to 180 mmHg immediately',
      'Select the appropriate cuff size based on the patient\'s arm circumference',
      'Position the patient with the arm at heart level',
      'Place the stethoscope diaphragm over the brachial artery',
    ],
    answer: 1,
    explanation: 'Selecting the correct cuff size is the first priority because an incorrectly sized cuff will produce inaccurate results regardless of technique. The cuff width should be ~40% of the arm circumference and the bladder should encircle ≥80% of the upper arm. A too-small cuff gives falsely high readings.',
  },
  {
    id: 'ha-ch3-q23',
    subject: 'health-assessment',
    chapter: 3,
    type: 'priority',
    question: 'The nurse is performing an abdominal assessment on a patient with suspected bowel obstruction. In what order should the assessment techniques be performed? Place them in the correct sequence. Which technique comes FIRST?',
    options: [
      'Palpation',
      'Percussion',
      'Auscultation',
      'Inspection',
    ],
    answer: 3,
    explanation: 'Abdominal assessment always begins with inspection (visual examination), then auscultation, then percussion, then palpation. Inspection is first in all assessments. Auscultation precedes percussion/palpation in the abdomen to avoid altering bowel sounds.',
  },
  {
    id: 'ha-ch3-q24',
    subject: 'health-assessment',
    chapter: 3,
    type: 'priority',
    question: 'The nurse is assessing a patient who reports severe left lower quadrant abdominal tenderness. During palpation, which area should the nurse assess FIRST?',
    options: [
      'Begin palpation at the left lower quadrant where the pain is reported',
      'Begin palpation at the right upper quadrant, away from the tender area',
      'Apply deep palpation immediately to identify the source of tenderness',
      'Palpate the umbilicus first, then move toward the painful area',
    ],
    answer: 1,
    explanation: 'Palpation should NEVER begin over the area of reported tenderness. Starting away from the painful area (opposite quadrant) allows the nurse to establish baseline muscle tone and identify voluntary vs. involuntary guarding before approaching the tender region. Beginning with light palpation in a non-tender area also prevents the patient from tensing up prematurely.',
  },
  {
    id: 'ha-ch3-q25',
    subject: 'health-assessment',
    chapter: 3,
    type: 'priority',
    question: 'The nurse receives four patients requiring physical assessment. Which patient should receive a PRIORITY assessment FIRST?',
    options: [
      'A 55-year-old with a known history of COPD who is due for routine vital signs',
      'A 30-year-old post-operative patient reporting incisional pain rated 5/10',
      'A 67-year-old who is suddenly unresponsive with no palpable radial pulse',
      'A 45-year-old with a new skin rash of unknown origin on the forearm',
    ],
    answer: 2,
    explanation: 'Sudden unresponsiveness with no palpable pulse is a cardiac/respiratory emergency requiring immediate assessment (ABCs) and activation of the emergency response system. This is a life-threatening situation that takes absolute priority. The other patients have stable, non-life-threatening concerns that can be safely deferred.',
  },
  // ─────────────────────────────────────────────
  // CHAPTER 4 — General Survey & Vital Signs (25)
  // ─────────────────────────────────────────────

  // MC
  {
    id: 'ha-ch4-q1',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'A nurse is preparing to measure a patient\'s oral temperature with an electronic thermometer. Which action is most appropriate?',
    options: [
      'Wait 30 minutes after the patient smokes before taking the temperature',
      'Place the probe in the center of the tongue',
      'Allow the patient to hold the probe in place with the teeth',
      'Record the temperature within 5 seconds of insertion',
    ],
    answer: 0,
    explanation:
      'Smoking, eating, or drinking hot/cold substances within 30 minutes falsely alters oral temperature. The probe should be placed in the posterior sublingual pocket, held by the lips — not the teeth — and left in place for the required time.',
    term: 'Oral temperature',
    definition:
      'Core temperature measured under the tongue in the posterior sublingual pocket; 96.8–100.4 °F (36–38 °C) normal range; avoid after eating, drinking, smoking, or O₂ therapy.',
  },
  {
    id: 'ha-ch4-q2',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'When comparing axillary and rectal temperature routes, which statement is correct?',
    options: [
      'Axillary temperature is 1°F higher than oral; rectal is 1°F lower',
      'Axillary temperature is 1°F lower than oral; rectal is 1°F higher',
      'Both routes yield the same reading as oral temperature',
      'Rectal temperature is 2°F lower than axillary temperature',
    ],
    answer: 1,
    explanation:
      'The axillary route reads approximately 1°F lower than oral and is the least accurate. The rectal route reads approximately 1°F higher than oral and reflects core temperature most accurately.',
    term: 'Temperature route comparison',
    definition:
      'Rectal ≈ oral +1°F (most accurate); axillary ≈ oral −1°F (least accurate); temporal artery and tympanic fall between these extremes.',
  },
  {
    id: 'ha-ch4-q3',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'A nurse is assessing an adult patient\'s radial pulse and finds the rhythm irregular. What is the most appropriate action?',
    options: [
      'Count for 30 seconds and multiply by 2',
      'Count for 15 seconds and multiply by 4',
      'Count for a full 60 seconds',
      'Use a pulse oximeter to determine the rate',
    ],
    answer: 2,
    explanation:
      'An irregular pulse must be counted for a full 60 seconds to obtain an accurate rate. The shortened 30-second method is appropriate only for regular rhythms.',
  },
  {
    id: 'ha-ch4-q4',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'A nurse suspects white coat hypertension in a patient whose blood pressure reads 148/92 mmHg in the clinic. Which assessment finding would support this suspicion?',
    options: [
      'Blood pressure 138/88 mmHg in the contralateral arm',
      'Blood pressure 118/76 mmHg obtained by the patient at home',
      'Patient reports recent exercise prior to the visit',
      'Patient has a history of chronic kidney disease',
    ],
    answer: 1,
    explanation:
      'White coat hypertension is a transient elevation caused by the clinical environment. Home readings that are consistently normal support this diagnosis.',
    term: 'White coat hypertension',
    definition:
      'Elevated blood pressure readings occurring only in clinical settings, attributed to anxiety; home or ambulatory readings remain within normal limits.',
  },
  {
    id: 'ha-ch4-q5',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'The nurse selects a blood pressure cuff that is too small for the patient\'s arm. What is the expected effect on the blood pressure reading?',
    options: [
      'Falsely low systolic and diastolic values',
      'Falsely high systolic and diastolic values',
      'Accurate systolic but falsely low diastolic value',
      'No effect on accuracy',
    ],
    answer: 1,
    explanation:
      'A cuff that is too small must be inflated to a higher pressure to compress the artery, yielding a falsely elevated blood pressure reading. A cuff that is too large produces a falsely low reading.',
  },
  {
    id: 'ha-ch4-q6',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'When assessing respiratory rate, the nurse counts chest rises for 30 seconds and multiplies by 2. Which additional action is essential?',
    options: [
      'Inform the patient before counting to promote cooperation',
      'Assess immediately before measuring blood pressure',
      'Count without telling the patient, transitioning from pulse assessment',
      'Document only if the rate falls outside 12–20 breaths/min',
    ],
    answer: 2,
    explanation:
      'Patients alter their breathing rate when they know it is being assessed. The nurse should count respirations without informing the patient, typically by keeping fingers on the wrist after pulse assessment.',
  },
  {
    id: 'ha-ch4-q7',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'Which position should the nurse place the patient in before performing a rectal temperature measurement?',
    options: [
      'Supine with knees flexed',
      'Left lateral (Sims) position',
      'Prone with a pillow under the abdomen',
      'Right lateral position',
    ],
    answer: 1,
    explanation:
      'The left lateral (Sims) position provides access to the rectum while keeping the patient comfortable. The lubricated probe is inserted approximately 1.5 inches in adults.',
    term: 'Rectal temperature technique',
    definition:
      'Patient in left lateral Sims position; lubricate probe; insert 1.5 inches in adults; reads ~1°F higher than oral; most accurate core temperature measurement.',
  },
  {
    id: 'ha-ch4-q8',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'The nurse auscultates the apical pulse at the 5th intercostal space, midclavicular line. For which patient situation is this method preferred over radial pulse assessment?',
    options: [
      'A healthy adult for a routine annual exam',
      'A patient taking digoxin with a reported irregular rhythm',
      'A post-surgical patient who is ambulating in the hallway',
      'A patient with a documented regular heart rate of 72 bpm',
    ],
    answer: 1,
    explanation:
      'The apical pulse is preferred for patients with irregular rhythms, those on cardiac medications like digoxin, and pediatric patients because peripheral pulses may be unreliable in these situations.',
  },
  {
    id: 'ha-ch4-q9',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'A nurse measures a patient\'s height using a stadiometer. Which instruction is correct?',
    options: [
      'The patient may wear socks but not shoes',
      'The patient should stand with heels apart and toes together',
      'The patient should remove shoes and stand with heels together against the stadiometer',
      'The patient should look upward to ensure accurate alignment',
    ],
    answer: 2,
    explanation:
      'For accurate height measurement, shoes must be removed. The patient stands erect with heels together against the stadiometer and looks straight ahead (Frankfort plane).',
  },
  {
    id: 'ha-ch4-q10',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'A patient\'s SpO₂ reads 93% on room air. How should the nurse interpret this finding?',
    options: [
      'Normal; no action needed',
      'Slightly low; requires further assessment and possible supplemental oxygen',
      'Critically low; requires immediate intubation',
      'Accurate only if confirmed by arterial blood gas analysis',
    ],
    answer: 1,
    explanation:
      'Normal adult SpO₂ is ≥95%. A reading of 93% is below normal and warrants further respiratory assessment. Clinical context and symptoms guide the urgency of intervention.',
  },
  {
    id: 'ha-ch4-q11',
    subject: 'health-assessment',
    chapter: 4,
    type: 'mc',
    question:
      'Which factor is most likely to cause a falsely low blood pressure reading?',
    options: [
      'Cuff that is too small for the arm',
      'Positioning the arm below the level of the heart',
      'Positioning the arm above the level of the heart',
      'Patient not resting for the required 5 minutes',
    ],
    answer: 2,
    explanation:
      'When the arm is above the level of the heart, hydrostatic pressure reduces the reading, producing a falsely low value. Arm at or below heart level produces falsely high readings in the reverse scenario.',
  },

  // TF
  {
    id: 'ha-ch4-q12',
    subject: 'health-assessment',
    chapter: 4,
    type: 'tf',
    question:
      'The tympanic thermometer reading can be affected by excessive cerumen buildup or an active ear infection.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. Cerumen and middle ear infections alter thermal conduction in the ear canal, potentially producing inaccurate tympanic temperature readings.',
    term: 'Tympanic temperature',
    definition:
      'Temperature measured via infrared sensor in the ear canal; affected by cerumen or ear infection; technique: tug pinna up and back in adults, down and back in children.',
  },
  {
    id: 'ha-ch4-q13',
    subject: 'health-assessment',
    chapter: 4,
    type: 'tf',
    question:
      'A normal adult resting blood pressure is considered anything below 130/85 mmHg.',
    options: ['True', 'False'],
    answer: 1,
    explanation:
      'False. Normal adult blood pressure is defined as less than 120 mmHg systolic AND less than 80 mmHg diastolic. Values between 120–129/<80 are classified as elevated.',
  },
  {
    id: 'ha-ch4-q14',
    subject: 'health-assessment',
    chapter: 4,
    type: 'tf',
    question:
      'When obtaining a patient\'s weight for accurate clinical comparison, the nurse should weigh the patient at the same time of day wearing the same amount of clothing.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. Standardizing the time of day and clothing ensures serial weights are comparable. A calibrated scale should also be used.',
  },
  {
    id: 'ha-ch4-q15',
    subject: 'health-assessment',
    chapter: 4,
    type: 'tf',
    question:
      'A radial pulse that is regular and within 60–100 bpm may be accurately assessed by counting for 30 seconds and multiplying the count by 2.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. The 30-second method is acceptable for a regular rhythm within the normal range. A full 60-second count is required for irregular rhythms, children, or patients on cardiac medications.',
  },

  // SATA
  {
    id: 'ha-ch4-q16',
    subject: 'health-assessment',
    chapter: 4,
    type: 'sata',
    question:
      'The nurse is preparing to measure a patient\'s blood pressure. Which actions reflect correct technique? (Select all that apply.)',
    options: [
      'Ask the patient to sit with legs uncrossed and feet flat on the floor',
      'Ensure the patient\'s arm is supported at heart level',
      'Instruct the patient to avoid caffeine for 30 minutes before measurement',
      'Inflate the cuff rapidly and deflate at 5–6 mmHg per second',
      'Listen for Korotkoff sounds during cuff deflation',
    ],
    answers: [0, 1, 2, 4],
    explanation:
      'Correct technique includes uncrossed legs, arm at heart level, no caffeine/smoking/exercise 30 min prior, and auscultating Korotkoff sounds. The cuff should be deflated at 2–3 mmHg/sec, not 5–6 mmHg/sec.',
  },
  {
    id: 'ha-ch4-q17',
    subject: 'health-assessment',
    chapter: 4,
    type: 'sata',
    question:
      'Which factors are known to increase heart rate? (Select all that apply.)',
    options: [
      'Fever',
      'Pain',
      'Beta-blocker medications',
      'Anxiety',
      'Physical exercise',
    ],
    answers: [0, 1, 3, 4],
    explanation:
      'Fever, pain, anxiety, and exercise all stimulate the sympathetic nervous system, increasing heart rate. Beta-blockers reduce heart rate and are not a cause of tachycardia.',
  },
  {
    id: 'ha-ch4-q18',
    subject: 'health-assessment',
    chapter: 4,
    type: 'sata',
    question:
      'The general survey includes assessment of which of the following? (Select all that apply.)',
    options: [
      'Overall appearance and hygiene',
      'Gait and posture',
      'Level of consciousness and affect',
      'Auscultation of bowel sounds',
      'Body habitus and dress',
    ],
    answers: [0, 1, 2, 4],
    explanation:
      'The general survey covers overall appearance, hygiene, gait, posture, affect, level of consciousness, and body habitus. Bowel sound auscultation is part of the abdominal assessment, not the general survey.',
  },
  {
    id: 'ha-ch4-q19',
    subject: 'health-assessment',
    chapter: 4,
    type: 'sata',
    question:
      'Which findings would cause the nurse to count a pulse for a full 60 seconds rather than 30 seconds? (Select all that apply.)',
    options: [
      'The rhythm is irregular',
      'The patient is a pediatric patient',
      'The patient is taking a cardiac glycoside',
      'The patient\'s pulse rate is 72 bpm and regular',
      'The patient is febrile',
    ],
    answers: [0, 1, 2],
    explanation:
      'A full 60-second count is required for irregular rhythms, pediatric patients, and patients on cardiac medications (e.g., digoxin). A regular rate of 72 bpm or fever alone does not require a full-minute count.',
    term: 'Apical pulse',
    definition:
      'Heart rate auscultated at the 5th intercostal space, midclavicular line; preferred for irregular rhythms, children, or cardiac medication monitoring.',
  },
  {
    id: 'ha-ch4-q20',
    subject: 'health-assessment',
    chapter: 4,
    type: 'sata',
    question:
      'Which of the following are normal adult vital sign ranges? (Select all that apply.)',
    options: [
      'Temperature: 96.8–100.4 °F',
      'Heart rate: 60–100 bpm',
      'Respiratory rate: 18–24 breaths/min',
      'Blood pressure: <120/<80 mmHg',
      'SpO₂: ≥95%',
    ],
    answers: [0, 1, 3, 4],
    explanation:
      'Normal adult vital signs: Temp 96.8–100.4°F, HR 60–100 bpm, RR 12–20 breaths/min, BP <120/<80 mmHg, SpO₂ ≥95%. A normal RR is 12–20, not 18–24.',
  },

  // Priority
  {
    id: 'ha-ch4-q21',
    subject: 'health-assessment',
    chapter: 4,
    type: 'priority',
    question:
      'The nurse is caring for four patients. Which patient requires priority vital sign assessment first?',
    options: [
      'Patient A: BP 118/76, HR 72, RR 16, SpO₂ 98%',
      'Patient B: BP 142/88, HR 88, RR 18, SpO₂ 97% — reports white coat anxiety',
      'Patient C: BP 90/58, HR 118, RR 24, SpO₂ 91% — appears diaphoretic',
      'Patient D: Temp 99.1°F, HR 82, RR 16, SpO₂ 96% — reports mild headache',
    ],
    answer: 2,
    explanation:
      'Patient C shows signs of hemodynamic compromise: hypotension, tachycardia, tachypnea, low SpO₂, and diaphoresis — indicating possible shock or respiratory failure. This patient is the priority.',
  },
  {
    id: 'ha-ch4-q22',
    subject: 'health-assessment',
    chapter: 4,
    type: 'priority',
    question:
      'A nurse obtains the following vital signs on a post-operative patient: BP 158/96, HR 102, RR 22, Temp 101.8°F. Which finding should the nurse address first?',
    options: [
      'Blood pressure 158/96 mmHg',
      'Heart rate 102 bpm',
      'Temperature 101.8°F',
      'Respiratory rate 22 breaths/min',
    ],
    answer: 2,
    explanation:
      'A temperature of 101.8°F in a post-operative patient is most concerning for surgical site infection or another infectious complication. Elevated HR, BP, and RR may all be driven by fever; addressing the fever source is the priority.',
  },
  {
    id: 'ha-ch4-q23',
    subject: 'health-assessment',
    chapter: 4,
    type: 'priority',
    question:
      'The nurse is about to measure vital signs on four patients. Which should be assessed first based on the most time-sensitive concern?',
    options: [
      'A patient scheduled for discharge whose final vitals are due',
      'A patient who requests pain medication and rates pain 6/10',
      'A patient who just returned from a bronchoscopy and has an SpO₂ of 89%',
      'A patient requesting their blood pressure be rechecked after resting',
    ],
    answer: 2,
    explanation:
      'SpO₂ of 89% is below acceptable limits and may indicate post-procedure respiratory compromise. This is a life-threatening concern requiring immediate assessment and intervention.',
  },
  {
    id: 'ha-ch4-q24',
    subject: 'health-assessment',
    chapter: 4,
    type: 'priority',
    question:
      'A nurse assesses a patient and notes a heart rate of 48 bpm, blood pressure 88/54 mmHg, and the patient reports feeling faint. What is the nurse\'s priority action?',
    options: [
      'Document findings and notify the charge nurse at the end of the shift',
      'Obtain a repeat blood pressure reading in 30 minutes',
      'Stay with the patient, apply supplemental oxygen, and notify the provider immediately',
      'Administer a scheduled beta-blocker as ordered',
    ],
    answer: 2,
    explanation:
      'Bradycardia combined with hypotension and pre-syncope indicates hemodynamic instability. The priority is patient safety: stay with the patient, apply O₂, and immediately notify the provider. Withhold any medications that could further lower the HR or BP.',
  },
  {
    id: 'ha-ch4-q25',
    subject: 'health-assessment',
    chapter: 4,
    type: 'priority',
    question:
      'When prioritizing vital sign measurements for an assigned group of patients at the start of the shift, which patient should be assessed first?',
    options: [
      'A stable patient with chronic hypertension whose BP is routinely 140s/90s',
      'A newly admitted patient whose admitting vital signs have not yet been obtained',
      'A patient who reports mild fatigue and asks the nurse to return in an hour',
      'A post-op day 3 patient who ambulated in the hallway without difficulty',
    ],
    answer: 1,
    explanation:
      'Newly admitted patients require a baseline set of vital signs before any care is initiated. Without a baseline, changes in condition cannot be identified. This takes priority over reassessments of stable patients.',
    term: 'Vital signs (general survey)',
    definition:
      'Objective measurements of physiologic function — temperature, heart rate, respiratory rate, blood pressure, and SpO₂ — that form the baseline for all clinical decision-making.',
  },

  // ─────────────────────────────────────────────
  // CHAPTER 5 — Nutritional Assessment (25)
  // ─────────────────────────────────────────────

  // MC
  {
    id: 'ha-ch5-q1',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'A patient asks why fat provides more energy than carbohydrates or protein. Which response is most accurate?',
    options: [
      'Fat yields 4 kcal/g, the same as carbohydrates but stored more efficiently',
      'Fat yields 9 kcal/g, making it the most calorie-dense macronutrient',
      'Fat yields 7 kcal/g and is the primary source of immediate energy',
      'Fat and protein both yield 9 kcal/g',
    ],
    answer: 1,
    explanation:
      'Fat provides 9 kcal per gram — more than twice the energy of carbohydrates (4 kcal/g) or protein (4 kcal/g). Fat is also essential for absorption of fat-soluble vitamins (A, D, E, K).',
    term: 'Macronutrient caloric density',
    definition:
      'Carbohydrates: 4 kcal/g (primary energy source); Protein: 4 kcal/g (growth and repair); Fat: 9 kcal/g (most calorie-dense; carries fat-soluble vitamins).',
  },
  {
    id: 'ha-ch5-q2',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'A nurse assesses a patient\'s skin turgor on the back of the hand. The skin slowly returns to place after 3 seconds. How should this finding be interpreted?',
    options: [
      'Normal finding; no clinical significance',
      'Sign of over-hydration',
      'Possible dehydration; warrants further assessment',
      'Expected finding in a well-nourished young adult',
    ],
    answer: 2,
    explanation:
      'Normal skin turgor returns to place within 2 seconds. A return time of >2 seconds suggests decreased skin elasticity, possibly due to dehydration. This requires further assessment including mucous membranes and urine color.',
    term: 'Skin turgor',
    definition:
      'Assessed by gently pinching the skin on the back of the hand; normal return to place in <2 seconds; delayed return (>2 sec) suggests dehydration.',
  },
  {
    id: 'ha-ch5-q3',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'Which BMI value classifies a patient as having Class II Obesity?',
    options: [
      'BMI 27.4',
      'BMI 32.1',
      'BMI 37.5',
      'BMI 41.2',
    ],
    answer: 2,
    explanation:
      'BMI classifications: Underweight <18.5; Normal 18.5–24.9; Overweight 25–29.9; Class I Obesity 30–34.9; Class II Obesity 35–39.9; Class III (morbid) ≥40. A BMI of 37.5 falls in Class II Obesity.',
    term: 'Body Mass Index (BMI)',
    definition:
      'Calculated as weight (kg) ÷ height (m²); categories: <18.5 underweight, 18.5–24.9 normal, 25–29.9 overweight, 30–34.9 Class I obesity, 35–39.9 Class II obesity, ≥40 Class III (morbid) obesity.',
  },
  {
    id: 'ha-ch5-q4',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'The nurse performs a 24-hour dietary recall with a patient. Which limitation of this screening tool should the nurse recognize?',
    options: [
      'It requires specialized laboratory analysis to interpret results',
      'It cannot be completed in an outpatient setting',
      'It relies on patient memory and may not reflect typical intake',
      'It only captures macronutrient intake, not micronutrients',
    ],
    answer: 2,
    explanation:
      'The 24-hour recall is a quick, practical screening tool but depends entirely on the patient\'s ability to accurately recall everything consumed. One day may also not represent the patient\'s typical dietary pattern.',
    term: '24-hour dietary recall',
    definition:
      'Nutritional screening tool where the patient recounts all foods and beverages consumed in the past 24 hours; quick to administer but limited by memory and single-day representation.',
  },
  {
    id: 'ha-ch5-q5',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'A patient who has been NPO (nothing by mouth) for 10 days following bowel surgery has developed peripheral edema, muscle wasting, and impaired wound healing. These findings are most consistent with which condition?',
    options: [
      'Hypervolemia',
      'Protein-calorie malnutrition',
      'Vitamin B12 deficiency',
      'Class III obesity',
    ],
    answer: 1,
    explanation:
      'Protein-calorie malnutrition results from inadequate intake of both protein and calories. Signs include muscle wasting, edema (due to low albumin reducing oncotic pressure), and poor wound healing.',
    term: 'Protein-calorie malnutrition',
    definition:
      'Inadequate protein AND calorie intake leading to muscle wasting, edema, impaired wound healing, and immune compromise; risk factors: poverty, elderly, cancer, GI disease, prolonged NPO status.',
  },
  {
    id: 'ha-ch5-q6',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'Which physical finding would most suggest iron deficiency anemia during a nutritional assessment?',
    options: [
      'Alopecia and dry skin',
      'Spooning (concave) nails (koilonychia)',
      'Yellow discoloration of the sclera',
      'Peripheral edema',
    ],
    answer: 1,
    explanation:
      'Koilonychia — spoon-shaped, concave nails — is a classic physical sign of iron deficiency anemia. Hair and skin changes can reflect multiple deficiencies; jaundice indicates liver/biliary problems; edema relates to protein deficiency.',
    term: 'Koilonychia',
    definition:
      'Spoon-shaped, concave nail beds; classic physical sign of iron deficiency anemia.',
  },
  {
    id: 'ha-ch5-q7',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'A nurse is assessing an 80-year-old patient for nutritional risk. Which factor specific to elderly patients most directly contributes to inadequate nutrition?',
    options: [
      'Increased metabolic rate requiring more caloric intake',
      'Social isolation, fixed income, and impaired dentition',
      'Hyperphagia caused by reduced leptin levels',
      'Excessive vitamin D synthesis from sun exposure',
    ],
    answer: 1,
    explanation:
      'Elderly patients face compounding barriers: social isolation reduces meal motivation, fixed incomes limit food access, and poor dentition or dysphagia impairs food consumption. These factors are unique to this population.',
  },
  {
    id: 'ha-ch5-q8',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'Which of the "Big 8" common food allergens is correctly identified?',
    options: [
      'Corn, peanuts, milk, eggs, wheat, soy, fish, shellfish',
      'Peanuts, tree nuts, milk, eggs, wheat, soy, fish, shellfish',
      'Peanuts, tree nuts, gluten, eggs, wheat, soy, fish, shellfish',
      'Peanuts, tree nuts, milk, eggs, rice, soy, fish, shellfish',
    ],
    answer: 1,
    explanation:
      'The "Big 8" common food allergens are: peanuts, tree nuts, milk, eggs, wheat, soy, fish, and shellfish. Corn and rice are not included; gluten is a protein in wheat, not a separate allergen category.',
    term: 'Big 8 food allergens',
    definition:
      'The eight most common food allergens: peanuts, tree nuts, milk, eggs, wheat, soy, fish, and shellfish; responsible for the majority of serious food allergic reactions.',
  },
  {
    id: 'ha-ch5-q9',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'Which weight change over 6 months meets the threshold for clinically significant unintentional weight loss?',
    options: [
      'Loss of 3 lbs in a patient weighing 200 lbs',
      'Loss of 8 lbs in a patient weighing 160 lbs',
      'Loss of 12 lbs in a patient weighing 240 lbs',
      'Loss of 5 lbs in a patient weighing 180 lbs',
    ],
    answer: 2,
    explanation:
      'Clinically significant unintentional weight loss is defined as >10 lbs OR >5% of body weight within 6 months. 12 lbs from 240 lbs = 5% (exactly at threshold), and also exceeds 10 lbs, meeting both criteria.',
  },
  {
    id: 'ha-ch5-q10',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'A nurse is assessing a patient\'s hydration status. Which finding is most indicative of adequate hydration?',
    options: [
      'Dark amber urine',
      'Dry, tacky mucous membranes',
      'Pale yellow urine and moist mucous membranes',
      'Skin turgor return of 4 seconds',
    ],
    answer: 2,
    explanation:
      'Pale yellow urine and moist mucous membranes indicate adequate hydration. Dark urine, dry membranes, and poor skin turgor are all signs of dehydration.',
  },
  {
    id: 'ha-ch5-q11',
    subject: 'health-assessment',
    chapter: 5,
    type: 'mc',
    question:
      'Which patient is at highest risk for developing an eating disorder based on established risk factors?',
    options: [
      'A 45-year-old man who is a recreational marathon runner',
      'A 16-year-old female athlete with a history of perfectionism and family pressure',
      'A 60-year-old woman with a BMI of 32 and sedentary lifestyle',
      'A 30-year-old male with type 2 diabetes and a low-calorie diet',
    ],
    answer: 1,
    explanation:
      'Eating disorder risk factors include female sex, adolescent/young adult age, perfectionism, trauma, family history, media pressure, and competitive athletics. The 16-year-old female athlete with perfectionism has the highest risk combination.',
  },

  // TF
  {
    id: 'ha-ch5-q12',
    subject: 'health-assessment',
    chapter: 5,
    type: 'tf',
    question:
      'The human body is approximately 60% water by weight.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. Approximately 60% of adult body weight is water. This proportion is slightly higher in lean individuals and lower in those with more adipose tissue.',
  },
  {
    id: 'ha-ch5-q13',
    subject: 'health-assessment',
    chapter: 5,
    type: 'tf',
    question:
      'Fat-soluble vitamins are absorbed with the help of dietary fat and include vitamins A, D, E, and K.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. Vitamins A, D, E, and K are fat-soluble and require dietary fat for absorption. This is one reason why very-low-fat diets can lead to deficiencies in these vitamins.',
  },
  {
    id: 'ha-ch5-q14',
    subject: 'health-assessment',
    chapter: 5,
    type: 'tf',
    question:
      'A BMI of 28 classifies a patient as Class I Obese.',
    options: ['True', 'False'],
    answer: 1,
    explanation:
      'False. A BMI of 28 falls within the Overweight category (25–29.9), not Obesity. Class I Obesity begins at BMI ≥30.',
  },
  {
    id: 'ha-ch5-q15',
    subject: 'health-assessment',
    chapter: 5,
    type: 'tf',
    question:
      'Sleep deprivation is a recognized risk factor for obesity.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. Sleep deprivation disrupts hormones that regulate appetite (increasing ghrelin and decreasing leptin), contributing to increased caloric intake and obesity risk.',
  },

  // SATA
  {
    id: 'ha-ch5-q16',
    subject: 'health-assessment',
    chapter: 5,
    type: 'sata',
    question:
      'Which patients are at elevated risk for protein-calorie malnutrition? (Select all that apply.)',
    options: [
      'A 78-year-old with advanced colorectal cancer on chemotherapy',
      'A 35-year-old healthy athlete with a high-protein diet',
      'A 65-year-old with Crohn\'s disease and multiple hospitalizations',
      'A 22-year-old with food insecurity and limited access to meals',
      'A patient who has been NPO for 8 days post-abdominal surgery',
    ],
    answers: [0, 2, 3, 4],
    explanation:
      'Risk factors for protein-calorie malnutrition include cancer, GI malabsorption disease, poverty/food insecurity, and prolonged NPO status. A healthy athlete with adequate protein intake is not at risk.',
  },
  {
    id: 'ha-ch5-q17',
    subject: 'health-assessment',
    chapter: 5,
    type: 'sata',
    question:
      'The nurse is assessing nutritional status. Which physical findings suggest nutrient deficiency? (Select all that apply.)',
    options: [
      'Brittle, dull hair with areas of loss',
      'Moist, pink mucous membranes',
      'Spooning of the nails (koilonychia)',
      'Peripheral edema',
      'Pink, intact skin with good turgor',
    ],
    answers: [0, 2, 3],
    explanation:
      'Brittle/dull hair and hair loss, koilonychia, and peripheral edema (from hypoalbuminemia) are signs of nutritional deficiency. Moist mucous membranes and intact skin with good turgor are normal findings.',
    term: 'Nutrient deficiency physical signs',
    definition:
      'Hair (brittle, dull, loss), nails (brittle, ridged, koilonychia), skin (pallor, poor wound healing, dermatitis, edema); peripheral edema from low albumin indicates protein deficiency.',
  },
  {
    id: 'ha-ch5-q18',
    subject: 'health-assessment',
    chapter: 5,
    type: 'sata',
    question:
      'Which factors are associated with an increased risk for obesity? (Select all that apply.)',
    options: [
      'Genetic predisposition',
      'Sedentary lifestyle',
      'Vigorous daily physical activity',
      'Certain medications (e.g., corticosteroids, antipsychotics)',
      'Chronic sleep deprivation',
    ],
    answers: [0, 1, 3, 4],
    explanation:
      'Obesity risk factors include genetics, sedentary lifestyle, certain medications (corticosteroids, antipsychotics, insulin), and sleep deprivation. Regular vigorous activity is protective, not a risk factor.',
  },
  {
    id: 'ha-ch5-q19',
    subject: 'health-assessment',
    chapter: 5,
    type: 'sata',
    question:
      'When assessing an elderly patient\'s nutritional status, which factors should the nurse specifically evaluate? (Select all that apply.)',
    options: [
      'Dentition and ability to chew',
      'Social isolation and meal frequency',
      'Fixed income and food access',
      'Increased basal metabolic rate',
      'Swallowing ability and history of dysphagia',
    ],
    answers: [0, 1, 2, 4],
    explanation:
      'Elderly nutritional assessment should address dentition, social isolation, fixed income limiting food access, and dysphagia. Basal metabolic rate actually decreases with aging, not increases.',
  },
  {
    id: 'ha-ch5-q20',
    subject: 'health-assessment',
    chapter: 5,
    type: 'sata',
    question:
      'Which clinical signs are consistent with dehydration? (Select all that apply.)',
    options: [
      'Skin turgor return >2 seconds',
      'Dark amber, concentrated urine',
      'Moist, glistening mucous membranes',
      'Sunken eyes',
      'Rapid, bounding peripheral pulses',
    ],
    answers: [0, 1, 3],
    explanation:
      'Dehydration signs: poor skin turgor (>2 sec return), dark concentrated urine, and sunken eyes. Moist membranes and bounding pulses are not signs of dehydration; dry mucous membranes and weak/rapid pulse would be expected instead.',
  },

  // Priority
  {
    id: 'ha-ch5-q21',
    subject: 'health-assessment',
    chapter: 5,
    type: 'priority',
    question:
      'The nurse is completing nutritional assessments on four patients. Which patient requires the most urgent nutritional intervention?',
    options: [
      'A patient with a BMI of 27 who eats fast food 3 times per week',
      'A post-op patient who has been NPO for 9 days with muscle wasting and peripheral edema',
      'A patient with a BMI of 19 who is a vegetarian',
      'A patient who reports skipping breakfast on most mornings',
    ],
    answer: 1,
    explanation:
      'Nine days of NPO with muscle wasting and peripheral edema indicates severe protein-calorie malnutrition. This is a clinical emergency requiring immediate nutritional support, likely parenteral or enteral nutrition.',
  },
  {
    id: 'ha-ch5-q22',
    subject: 'health-assessment',
    chapter: 5,
    type: 'priority',
    question:
      'A nurse reviews BMI data for four patients. Which patient should receive priority education about obesity-related health risks?',
    options: [
      'Patient A: BMI 24.5',
      'Patient B: BMI 29.8',
      'Patient C: BMI 41.3',
      'Patient D: BMI 18.2',
    ],
    answer: 2,
    explanation:
      'A BMI of 41.3 classifies the patient as Class III (morbid) obesity, carrying the highest risk for cardiovascular disease, type 2 diabetes, sleep apnea, and other comorbidities. This patient requires priority education and intervention.',
  },
  {
    id: 'ha-ch5-q23',
    subject: 'health-assessment',
    chapter: 5,
    type: 'priority',
    question:
      'A nurse is caring for a patient with a known peanut allergy who is about to receive a meal tray. The nurse notices the tray contains a dish with a peanut sauce. What is the nurse\'s priority action?',
    options: [
      'Administer epinephrine as a precaution before the patient eats',
      'Remove the dish and contact dietary services for a replacement allergen-free meal',
      'Instruct the patient to eat around the peanut sauce',
      'Document the error and continue monitoring the patient',
    ],
    answer: 1,
    explanation:
      'The priority action is to remove the allergen-containing food and obtain a safe replacement meal before any ingestion occurs. Epinephrine is used only for anaphylaxis, not prophylactically.',
  },
  {
    id: 'ha-ch5-q24',
    subject: 'health-assessment',
    chapter: 5,
    type: 'priority',
    question:
      'The nurse is counseling a patient about unintentional weight loss. Which finding requires the most immediate follow-up?',
    options: [
      'Loss of 3 lbs over 8 months in a 190-lb patient',
      'Loss of 2 lbs after starting a new exercise program',
      'Loss of 18 lbs over 5 months in a 160-lb patient (>10%)',
      'Loss of 4 lbs after resolving a gastrointestinal illness',
    ],
    answer: 2,
    explanation:
      'An 18-lb loss from a 160-lb baseline over 5 months represents >10% body weight loss — well above the clinically significant threshold of >10 lbs or >5% in 6 months. This warrants urgent evaluation for malignancy, GI disease, or other serious etiology.',
    term: 'Clinically significant weight loss',
    definition:
      'Unintentional loss of >10 lbs OR >5% of body weight within a 6-month period; requires evaluation for underlying illness such as cancer, GI disease, or depression.',
  },
  {
    id: 'ha-ch5-q25',
    subject: 'health-assessment',
    chapter: 5,
    type: 'priority',
    question:
      'A nurse is assessing four patients for nutritional risk. Which patient should receive nutritional consultation first?',
    options: [
      'A 40-year-old with a BMI of 26 who eats a balanced diet',
      'A 70-year-old with poor dentition, eating soft foods, living alone on Social Security',
      'A 25-year-old athlete with a high-calorie, high-protein diet',
      'A 55-year-old who skips lunch on work days',
    ],
    answer: 1,
    explanation:
      'The elderly patient with poor dentition, social isolation, and financial limitation faces multiple overlapping nutritional risk factors. This combination dramatically increases risk for malnutrition and warrants priority consultation.',
  },

  // ─────────────────────────────────────────────
  // CHAPTER 6 — Skin, Hair & Nails Assessment (25)
  // ─────────────────────────────────────────────

  // MC
  {
    id: 'ha-ch6-q1',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'A patient with dark skin tone is admitted with suspected respiratory failure. The nurse is assessing for cyanosis. Which assessment site is most reliable for detecting cyanosis in this patient?',
    options: [
      'Skin over the anterior chest wall',
      'Lips and nail beds',
      'Dorsum of the hands',
      'Skin over the forehead',
    ],
    answer: 1,
    explanation:
      'In patients with dark skin, general skin color changes are difficult to detect. Cyanosis is best assessed at the lips and nail beds, which appear ashen or gray in dark-skinned individuals rather than blue.',
    term: 'Cyanosis in dark skin',
    definition:
      'Assessed at lips and nail beds; appears ashen/gray in dark skin rather than blue; conjunctivae and mucous membranes also useful for detecting pallor and jaundice in dark-skinned patients.',
  },
  {
    id: 'ha-ch6-q2',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'The nurse assesses a patient\'s nail and notes the nail angle is greater than 180° with a spongy, boggy nail bed on palpation. Which condition does this finding suggest?',
    options: [
      'Iron deficiency anemia',
      'Psoriasis',
      'Chronic tissue hypoxia (clubbing)',
      'Systemic illness causing Beau\'s lines',
    ],
    answer: 2,
    explanation:
      'Nail clubbing is characterized by a nail angle >180° and a spongy nail bed. It indicates chronic hypoxia and is associated with conditions such as COPD, heart failure, and lung cancer.',
    term: 'Nail clubbing',
    definition:
      'Nail angle >180° with a spongy nail bed; caused by chronic tissue hypoxia from COPD, heart failure, or lung cancer; normal nail angle is approximately 160°.',
  },
  {
    id: 'ha-ch6-q3',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'A patient presents with a flat, pigmented lesion less than 1 cm in diameter on the forearm. How is this skin lesion classified?',
    options: [
      'Papule',
      'Wheal',
      'Macule',
      'Vesicle',
    ],
    answer: 2,
    explanation:
      'A macule is a flat, non-palpable color change smaller than 1 cm. Examples include freckles and flat moles. A papule is raised and solid; a wheal is transient and raised; a vesicle is fluid-filled.',
    term: 'Macule',
    definition:
      'Flat, non-palpable skin lesion <1 cm with a color change; examples: freckle, flat nevus, petechiae; no elevation above the skin surface.',
  },
  {
    id: 'ha-ch6-q4',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'During a skin assessment, the nurse finds a reddened area on the patient\'s sacrum that does not blanch with finger pressure. The skin remains intact. Which pressure ulcer stage does this represent?',
    options: [
      'Stage 1',
      'Stage 2',
      'Stage 3',
      'Stage 4',
    ],
    answer: 0,
    explanation:
      'Stage 1 pressure ulcers feature intact skin with non-blanchable erythema, often with the area feeling warm and firm. Stage 2 involves partial thickness skin loss; Stage 3 and 4 involve progressively deeper tissue destruction.',
    term: 'Pressure ulcer Stage 1',
    definition:
      'Intact skin with non-blanchable erythema; the area may be painful, firm, warm, or cooler than surrounding tissue; no open wound.',
  },
  {
    id: 'ha-ch6-q5',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'A nurse observes a wound with full-thickness skin loss where subcutaneous tissue is visible, but no bone, tendon, or muscle is exposed. Which wound stage does this describe?',
    options: [
      'Stage 2',
      'Stage 3',
      'Stage 4',
      'Unstageable',
    ],
    answer: 1,
    explanation:
      'Stage 3 pressure ulcers have full-thickness tissue loss with visible subcutaneous fat but without exposed bone, tendon, or muscle. Stage 4 involves exposure of these deeper structures.',
  },
  {
    id: 'ha-ch6-q6',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'A nurse is educating a patient about the ABCDE method for skin self-examination. Which description accurately represents the "E" criterion?',
    options: [
      'Enlargement — lesion diameter growing beyond 6 mm',
      'Elevation — lesion becoming raised above the skin surface',
      'Evolving — any change in size, shape, color, or new symptom',
      'Erythema — redness surrounding the lesion border',
    ],
    answer: 2,
    explanation:
      'The "E" in ABCDE stands for Evolving — any change in the lesion over time, including size, shape, color, or the development of new symptoms like bleeding or itching. This is a critical warning sign for melanoma.',
    term: 'ABCDEs of melanoma',
    definition:
      'Asymmetry, Border (irregular/ragged), Color (varied/multiple shades), Diameter (>6mm, size of pencil eraser), Evolving (changing in any characteristic); used for melanoma screening.',
  },
  {
    id: 'ha-ch6-q7',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'Which gland type is responsible for thermoregulation through sweat production distributed across most of the body surface?',
    options: [
      'Apocrine glands',
      'Sebaceous glands',
      'Eccrine glands',
      'Meibomian glands',
    ],
    answer: 2,
    explanation:
      'Eccrine glands are distributed across the body and produce sweat for thermoregulation. Apocrine glands are found in axillary and groin areas and respond to emotional stimuli. Sebaceous glands produce sebum for lubrication.',
    term: 'Eccrine glands',
    definition:
      'Sweat glands distributed across most body surfaces; primary function is thermoregulation through evaporative cooling; most numerous on palms, soles, and forehead.',
  },
  {
    id: 'ha-ch6-q8',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'A nurse notes non-blanching red-purple spots less than 3 mm in diameter scattered across a patient\'s lower extremities. How are these lesions classified?',
    options: [
      'Purpura',
      'Petechiae',
      'Ecchymosis',
      'Macules',
    ],
    answer: 1,
    explanation:
      'Petechiae are tiny (< 3 mm), non-blanching red or purple spots caused by bleeding into the skin, often indicating a platelet disorder or vascular fragility. Purpura are larger (>3 mm); ecchymosis is a broader bruise.',
    term: 'Petechiae',
    definition:
      'Tiny (<3 mm), non-blanching red/purple spots from bleeding into the skin; suggest platelet disorder or vascular fragility; do not disappear with pressure.',
  },
  {
    id: 'ha-ch6-q9',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'The nurse is assessing a patient with jaundice and dark skin. Where is the best location to assess for jaundice?',
    options: [
      'Skin over the sternum',
      'Dorsal surface of the forearms',
      'Sclera of the eyes and oral mucous membranes',
      'Palmar surface of the hands',
    ],
    answer: 2,
    explanation:
      'In dark-skinned patients, yellowing of the skin can be difficult to detect. The sclera and mucous membranes (oral mucosa, hard palate) are better sites because they show bilirubin accumulation regardless of skin pigmentation.',
  },
  {
    id: 'ha-ch6-q10',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'A patient has horizontal ridges (grooves) running across all fingernails. Which condition is most associated with this nail finding?',
    options: [
      'Iron deficiency anemia',
      'Psoriasis',
      'Minor trauma',
      'Systemic illness (Beau\'s lines)',
    ],
    answer: 3,
    explanation:
      'Beau\'s lines are transverse (horizontal) ridges across the nail plate caused by a temporary interruption in nail growth, often due to systemic illness, high fever, chemotherapy, or severe nutritional deficiency.',
    term: "Beau's lines",
    definition:
      'Horizontal ridges or grooves across the nail plate caused by temporary arrest of nail growth; associated with serious systemic illness, high fever, chemotherapy, or severe nutritional deficiency.',
  },
  {
    id: 'ha-ch6-q11',
    subject: 'health-assessment',
    chapter: 6,
    type: 'mc',
    question:
      'Which skin lesion description best matches a keloid?',
    options: [
      'Flat, color-change lesion smaller than 1 cm',
      'Raised, fluid-filled lesion smaller than 1 cm',
      'Hypertrophic scar that extends beyond the original wound margins',
      'Full-thickness loss of epidermis and dermis with wound depth',
    ],
    answer: 2,
    explanation:
      'A keloid is an overgrown, hypertrophic scar that extends beyond the boundaries of the original wound. It results from excessive collagen production during healing and is more common in individuals with darker skin tones.',
    term: 'Keloid',
    definition:
      'Raised, hypertrophic scar extending beyond the original wound margins due to excessive collagen deposition; more prevalent in people with darker skin tones; may be pruritic or tender.',
  },

  // TF
  {
    id: 'ha-ch6-q12',
    subject: 'health-assessment',
    chapter: 6,
    type: 'tf',
    question:
      'Vitamin D synthesis is one of the functions of the skin.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. The skin synthesizes vitamin D3 (cholecalciferol) when exposed to ultraviolet B (UVB) radiation from sunlight. This is an essential function for calcium absorption and bone health.',
  },
  {
    id: 'ha-ch6-q13',
    subject: 'health-assessment',
    chapter: 6,
    type: 'tf',
    question:
      'A Stage 4 pressure ulcer involves only partial thickness skin loss and may present as a shallow open ulcer or intact blister.',
    options: ['True', 'False'],
    answer: 1,
    explanation:
      'False. This description matches Stage 2, which involves partial thickness skin loss with a shallow open ulcer or blister. Stage 4 involves full-thickness loss with exposed bone, tendon, or muscle.',
  },
  {
    id: 'ha-ch6-q14',
    subject: 'health-assessment',
    chapter: 6,
    type: 'tf',
    question:
      'Erythema (redness) in a patient with dark skin is best assessed by palpating the area for warmth rather than relying on visual inspection alone.',
    options: ['True', 'False'],
    answer: 0,
    explanation:
      'True. Visual redness may not be apparent in dark-skinned patients. Palpating for warmth, firmness, edema, or pain provides more reliable information about underlying inflammation or tissue injury.',
    term: 'Skin assessment in dark-skinned patients',
    definition:
      'Rely on palpation for warmth (erythema/inflammation), assess conjunctivae/mucous membranes for pallor, check sclera for jaundice, and assess lips/nail beds for cyanosis rather than relying solely on skin color changes.',
  },
  {
    id: 'ha-ch6-q15',
    subject: 'health-assessment',
    chapter: 6,
    type: 'tf',
    question:
      'Apocrine sweat glands are primarily responsible for thermoregulation and are distributed across the entire body surface.',
    options: ['True', 'False'],
    answer: 1,
    explanation:
      'False. Apocrine glands respond to emotional stimuli and are located in the axillae and groin, not distributed over the whole body. Eccrine glands are responsible for thermoregulation and are widely distributed.',
  },

  // SATA
  {
    id: 'ha-ch6-q16',
    subject: 'health-assessment',
    chapter: 6,
    type: 'sata',
    question:
      'Which findings represent expected normal skin assessment results? (Select all that apply.)',
    options: [
      'Skin warm and dry to touch',
      'Intact skin without open areas',
      'Non-blanchable erythema over bony prominences',
      'Uniform color appropriate to patient\'s baseline',
      'Skin turgor returning to place in less than 2 seconds',
    ],
    answers: [0, 1, 3, 4],
    explanation:
      'Normal skin is warm, dry, intact, uniformly pigmented for the individual\'s baseline, and has good turgor (returns <2 sec). Non-blanchable erythema over bony prominences is a Stage 1 pressure ulcer, not a normal finding.',
  },
  {
    id: 'ha-ch6-q17',
    subject: 'health-assessment',
    chapter: 6,
    type: 'sata',
    question:
      'Which of the following are recognized risk factors for skin cancer? (Select all that apply.)',
    options: [
      'Fair skin and light-colored eyes',
      'Chronic UV exposure and tanning bed use',
      'Personal or family history of melanoma',
      'Dark skin tone with high melanin content',
      'Immunosuppression from transplant medications',
    ],
    answers: [0, 1, 2, 4],
    explanation:
      'Skin cancer risk factors include fair/light skin, UV exposure, tanning bed use, personal or family history of melanoma, and immunosuppression. High melanin content in dark skin actually provides some UV protection, lowering (not raising) risk.',
    term: 'Skin cancer risk factors',
    definition:
      'UV exposure, fair/light skin, family or personal history of melanoma, immunosuppression, tanning bed use, geographic location (higher altitude or closer to equator).',
  },
  {
    id: 'ha-ch6-q18',
    subject: 'health-assessment',
    chapter: 6,
    type: 'sata',
    question:
      'The nurse is documenting a wound assessment. Which elements should be included in a comprehensive wound description? (Select all that apply.)',
    options: [
      'Location and size (length × width × depth)',
      'Drainage type and amount',
      'Patient\'s most recent blood pressure',
      'Wound edges and surrounding tissue condition',
      'Presence and level of pain',
    ],
    answers: [0, 1, 3, 4],
    explanation:
      'Comprehensive wound documentation includes location, size (LxWxD), drainage (type, amount), wound edges, surrounding tissue (color, warmth, edema), and pain. Blood pressure is not a component of wound assessment.',
  },
  {
    id: 'ha-ch6-q19',
    subject: 'health-assessment',
    chapter: 6,
    type: 'sata',
    question:
      'Which nail assessment findings indicate an underlying systemic or hematologic condition? (Select all that apply.)',
    options: [
      'Nail clubbing (angle >180°)',
      'Koilonychia (spoon-shaped nails)',
      'Nail pitting',
      'Short, neatly trimmed nails',
      "Beau's lines (transverse ridges)",
    ],
    answers: [0, 1, 2, 4],
    explanation:
      'Clubbing indicates chronic hypoxia; koilonychia suggests iron deficiency anemia; nail pitting is associated with psoriasis; Beau\'s lines indicate systemic illness. Short, neatly trimmed nails are a normal grooming finding.',
    term: 'Nail assessment findings',
    definition:
      'Clubbing (chronic hypoxia), koilonychia/spooning (iron deficiency), pitting (psoriasis), Beau\'s lines (systemic illness), leukonychia (white streaks — minor trauma).',
  },
  {
    id: 'ha-ch6-q20',
    subject: 'health-assessment',
    chapter: 6,
    type: 'sata',
    question:
      'Which health promotion recommendations should the nurse include when teaching a patient about skin cancer prevention? (Select all that apply.)',
    options: [
      'Apply SPF 30 or higher sunscreen daily, even on cloudy days',
      'Perform monthly skin self-examinations',
      'Avoid tanning beds and artificial UV devices',
      'Use SPF 15 sunscreen only during outdoor water activities',
      'Wear protective clothing, hats, and UV-blocking sunglasses',
    ],
    answers: [0, 1, 2, 4],
    explanation:
      'Skin cancer prevention includes daily SPF ≥30 sunscreen, monthly self-exams, avoiding tanning beds, and wearing protective clothing. SPF 15 is insufficient for adequate protection; SPF ≥30 is the minimum recommendation.',
  },

  // Priority
  {
    id: 'ha-ch6-q21',
    subject: 'health-assessment',
    chapter: 6,
    type: 'priority',
    question:
      'The nurse is assessing several skin findings in a patient. Which finding requires the most immediate reporting to the provider?',
    options: [
      'Multiple freckles on sun-exposed arms, unchanged for years',
      'A 4 mm raised lesion with irregular borders, multiple colors, and recent bleeding',
      'Dry, slightly flaky skin on the lower legs of a patient with diabetes',
      'A healing surgical incision with minimal serous drainage on post-op day 2',
    ],
    answer: 1,
    explanation:
      'A raised lesion >3 mm with irregular borders, multiple colors, and recent bleeding meets multiple ABCDE criteria for melanoma. This requires immediate provider notification and urgent dermatology referral.',
  },
  {
    id: 'ha-ch6-q22',
    subject: 'health-assessment',
    chapter: 6,
    type: 'priority',
    question:
      'A nurse is caring for a bedridden patient who has developed a sacral pressure ulcer. Wound assessment reveals exposed bone at the wound base. Which stage should the nurse document, and which action is the priority?',
    options: [
      'Stage 2; apply a transparent film dressing and reposition every 4 hours',
      'Stage 3; initiate a wound care consult and reposition every 2 hours',
      'Stage 4; notify the provider immediately and initiate aggressive wound care and pressure relief',
      'Stage 1; increase oral fluids and monitor for progression',
    ],
    answer: 2,
    explanation:
      'Exposed bone defines a Stage 4 pressure ulcer — the most severe stage, associated with serious infection risk (osteomyelitis). Priority actions include immediate provider notification, wound care consultation, and strict pressure relief.',
    term: 'Pressure ulcer Stage 4',
    definition:
      'Full-thickness tissue loss with exposed or directly palpable bone, tendon, or muscle; highest stage; associated with risk of osteomyelitis and sepsis; requires immediate intervention.',
  },
  {
    id: 'ha-ch6-q23',
    subject: 'health-assessment',
    chapter: 6,
    type: 'priority',
    question:
      'The nurse assesses four patients and notes the following findings. Which patient should be evaluated first?',
    options: [
      'Patient A: dry skin and mild pruritus on forearms, no open areas',
      'Patient B: Stage 1 pressure ulcer on the coccyx, non-blanchable erythema, skin intact',
      'Patient C: purpuric rash covering the trunk and extremities, fever 102.8°F, appears ill',
      'Patient D: small superficial abrasion on the knee from a fall, bleeding controlled',
    ],
    answer: 2,
    explanation:
      'Non-blanching purpura with fever in an ill-appearing patient raises concern for meningococcemia or another life-threatening condition. This patient requires immediate evaluation. Purpura + fever is a medical emergency.',
    term: 'Purpura',
    definition:
      'Non-blanching skin lesion >3 mm caused by bleeding into the skin; when combined with fever and systemic illness, may indicate meningococcemia — a life-threatening emergency.',
  },
  {
    id: 'ha-ch6-q24',
    subject: 'health-assessment',
    chapter: 6,
    type: 'priority',
    question:
      'A nurse finds a patient with cool, pale extremities, delayed capillary refill >3 seconds, and mottled skin. What is the nurse\'s priority interpretation?',
    options: [
      'Normal finding in an elderly patient with thin skin',
      'Sign of early iron deficiency anemia requiring dietary counseling',
      'Indication of poor peripheral perfusion possibly from shock or severe vasoconstriction',
      'Reaction to cold ambient temperature; apply blankets and reassess',
    ],
    answer: 2,
    explanation:
      'Cool, pale, mottled extremities with delayed capillary refill indicate compromised peripheral perfusion. This is a sign of shock or severe circulatory compromise and requires immediate clinical assessment and provider notification.',
  },
  {
    id: 'ha-ch6-q25',
    subject: 'health-assessment',
    chapter: 6,
    type: 'priority',
    question:
      'A patient is admitted with a suspected stage 2 pressure ulcer. The nurse\'s priority action is to:',
    options: [
      'Photograph the wound and continue routine care',
      'Apply an antibiotic ointment without a provider order',
      'Perform a complete wound assessment, initiate pressure relief measures, and notify the wound care team',
      'Document the finding in the chart and re-evaluate in 24 hours',
    ],
    answer: 2,
    explanation:
      'A Stage 2 pressure ulcer requires complete wound documentation (location, size, drainage, surrounding tissue), immediate pressure relief (repositioning, support surfaces), and wound care team notification to prevent further deterioration.',
  },
]
