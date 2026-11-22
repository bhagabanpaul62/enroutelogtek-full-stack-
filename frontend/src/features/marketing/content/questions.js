// Answers come from how the product actually behaves (see backend/src/features/*). Keep them true.
export const registerQuestions = [
    {
        q: 'Which companies can register?',
        a: 'Manufacturers and shippers, transporters, brokers and fleet owners. One type per company.',
    },
    {
        q: 'What happens after I submit?',
        a: 'The company shows as pending. A person checks the documents, and you get an email either way.',
    },
    {
        q: 'Can I register before choosing a plan?',
        a: 'Yes. Registration has no plan step; plans are chosen later.',
    },
    {
        q: 'I forgot my password.',
        a: 'Use Forgot password on the login page; a one-time code goes to your email.',
    },
];

export const workingQuestions = [
    {
        q: 'Can two transporters connect?',
        a: 'No. Connections run only between different company types.',
    },
    {
        q: 'Can my team share one login?',
        a: 'No. One seat, one person, one device at a time.',
    },
    {
        q: 'What if a request is rejected?',
        a: 'The sender can send again. If you want no more requests from a company, block it.',
    },
    {
        q: 'Can I block a company?',
        a: 'Yes. A blocked company cannot find you or send requests; unblock it from the Blocked tab.',
    },
];

export const questions = [...registerQuestions, ...workingQuestions];

// The landing page's own set, in plain words for a first-time visitor.
export const homeQuestions = [
    {
        q: 'Who can join?',
        a: 'Companies that send goods, transport companies, brokers and truck owners. Each company joins as one of these.',
    },
    {
        q: 'What happens after I sign up?',
        a: 'A person checks your GST and PAN papers. You get an email when your company is approved, or told why not.',
    },
    {
        q: 'Do I have to pay to start?',
        a: 'No. You get 14 days free from the day you are approved, and choose a plan after that.',
    },
    {
        q: 'Can my team share one login?',
        a: 'No. Every person gets their own login, so you always know who did what.',
    },
    {
        q: 'Can I stop a company from contacting me?',
        a: 'Yes. Block it, and it can no longer find you or send you requests.',
    },
];
