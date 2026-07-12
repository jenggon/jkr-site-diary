@AGENTS.md



\# Site Diary Development Rules



Architecture Status:



LOCKED



Current State Table



site\_diary



contains ONLY the latest state.



Audit Table



site\_diary\_logs



contains immutable history.



Edit Flow



NEW



↓



INSERT site\_diary



↓



INSERT site\_diary\_logs



UPDATE



↓



UPDATE site\_diary



↓



INSERT site\_diary\_logs



Trade Recommendation Engine



Priority



MSP Resources



↓



Knowledge Engine



↓



Trade Library



Knowledge Engine Scoring



AHI



\+



Subtask



\+



Frequency



\+



Recency



Return only Top 3 suggestions.



Do not redesign this engine unless explicitly requested.



Never use site\_diary\_logs as Current State.



Never duplicate UPDATE records inside site\_diary.



