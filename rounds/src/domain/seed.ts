/**
 * Built-in rounding templates, seeded per owner on first use. The employee
 * questions are the classic evidence-based leader-rounding set; the patient
 * questions target the drivers behind HCAHPS domains (communication,
 * responsiveness, pain, environment).
 */

import type { Question, RoundTemplate } from './types.ts';

const q = (id: string, prompt: string, kind: Question['kind']): Question => ({ id, prompt, kind });

export function builtInTemplates(ownerId: string): RoundTemplate[] {
  return [
    {
      id: `tmpl-employee-rounding:${ownerId}`,
      ownerId,
      name: 'Employee Rounding',
      audience: 'employee',
      builtIn: true,
      questions: [
        q('working-well', 'What is working well today?', 'text'),
        q('tools-equipment', 'Do you have the tools and equipment you need to do your job?', 'yesNo'),
        q('recognize', 'Is there anyone I should recognize for doing great work?', 'text'),
        q('improve', 'What one thing could we do better on this unit?', 'text'),
        q('supported', 'How supported do you feel by leadership right now? (1–5)', 'scale'),
      ],
    },
    {
      id: `tmpl-patient-rounding:${ownerId}`,
      ownerId,
      name: 'Patient / Nurse-Leader Rounding',
      audience: 'patient',
      builtIn: true,
      questions: [
        q('care-team', 'Is our team communicating clearly about your care? (1–5)', 'scale'),
        q('responsiveness', 'When you press the call button, do we respond promptly? (1–5)', 'scale'),
        q('pain', 'Is your pain being managed to your comfort? (1–5)', 'scale'),
        q('quiet-clean', 'Is your room quiet and clean?', 'yesNo'),
        q('anything-else', 'Is there anything we can do for you right now?', 'text'),
      ],
    },
  ];
}
