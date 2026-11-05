import JsonLd from './parts/JsonLd';
import Questions from './parts/Questions';
import { questions, registerQuestions, workingQuestions } from '../content/questions';

const DOCUMENTS = [
    ['Manufacturers and shippers', 'GST and PAN'],
    ['Transporters', 'GST and PAN'],
    ['Brokers', 'PAN'],
    ['Fleet owners', 'PAN'],
];

const WRITING = [
    { q: 'Email', a: 'hello@enroutelogtek.in' },
    { q: 'Include', a: 'Your Enroute ID, which starts with ENR, and your company type.' },
    { q: 'About a registration', a: 'The company email you registered with, and when you submitted.' },
];

const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
};

export default function SupportPage() {
    return (
        <div className="mk mk-page">
            <JsonLd data={faqData} />

            <header className="container mk-banner">
                <h1>Answers, and a person to write to.</h1>
                <div className="mk-banner__side">
                    <p className="lead">
                        Documents by company type, the rules, and the address for everything else.
                    </p>
                    <a className="mk-btn" href="mailto:hello@enroutelogtek.in">
                        Write to us
                    </a>
                </div>
            </header>

            <Questions id="before" title="Before you register" items={registerQuestions} gap="s" />

            <section className="container mk-section" aria-labelledby="docs-title">
                <div className="mk-grid">
                    <div className="mk-head mk-head--split">
                        <h2 id="docs-title">Documents by company type</h2>
                        <p className="lead">Uploaded during registration, checked by a person.</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <table className="mk-table">
                            <thead>
                                <tr>
                                    <th scope="col">Company type</th>
                                    <th scope="col">Documents required</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DOCUMENTS.map(([type, docs]) => (
                                    <tr key={type}>
                                        <th scope="row">{type}</th>
                                        <td>{docs}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <Questions id="working" title="Once you are in" items={workingQuestions} />

            <Questions id="writing" title="Writing to us" items={WRITING} />
        </div>
    );
}
