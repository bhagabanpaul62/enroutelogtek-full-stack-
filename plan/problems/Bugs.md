Website Testing Bug Report

Date: November 19, 2026

Status: Open / Needs Attention

1. Form Dropdown Box Options Not Clearly Visible

Category: UI / Styling

Description: The options inside the form dropdown boxes lack proper contrast or styling, making them difficult or impossible to read clearly when expanded.

Expected Result: Dropdown options should have clear text contrast, proper background colors, and readable font styling across all states (default, hover, active).

2. Form Input Fields and Borders Not Visible

Category: UI / Styling

Description: Input fields on the forms blend into the background because their borders and field boundaries are missing or invisible.

Expected Result: All form input fields should have clearly defined, visible borders and distinct focus states so users can easily identify where to enter data.

3. Contact Number Field Accepts More Than 15 Digits

Category: Form Validation

Description: The contact number input field currently lacks a maximum character/digit limit, allowing users to enter more than 15 digits.

Expected Result: In accordance with standard international phone number formatting (E.164), the contact number field should restrict input to a maximum of 15 digits and display an appropriate validation error if exceeded.

4. Load Contract Types Missing & Not Separated from Adhoc Load

Category: Functional / Logic

Description: The load contract types have not been implemented yet, and the contract field is currently combined with or indistinguishable from the adhoc load option.

Expected Result:

Build and populate the required Load Contract Types.

Separate the Contract field/workflow from the Adhoc Load field so users can distinctly select and manage each load type independently.