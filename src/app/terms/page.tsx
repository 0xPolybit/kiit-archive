export const metadata = { title: "Terms · KIIT Archive" };

const TERMS = [
  "The existence of this website does not intend to harm anyone or infringe upon any individual's privacy.",
  "All data hereby displayed is availed via public documents by KIIT University.",
  'No sensitive information, or information that can be deemed to provoke "stalking" behaviour, are displayed, nor stored in our database.',
  "The website is not affiliated with KIIT University, and is a personal project by the developer.",
];

export default function TermsPage() {
  return (
    <>
      <h1>Terms</h1>
      <div className="panel">
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          {TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
