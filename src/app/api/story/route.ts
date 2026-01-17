export async function GET() {
  return Response.json({
    topics: [
      { key: "space", title: "הרפתקה בחלל" },
      { key: "ocean", title: "מסע בים" },
      { key: "jungle", title: "ג׳ונגל מסתורי" },
    ],
  });
}

export async function POST(req: Request) {
  const { child, topic } = await req.json();

  const TOPICS: Record<string, { title: string; template: string }> = {
    space: { title: "הרפתקה בחלל", template: "יום אחד, {child}, גילית דלת סודית לחללית..." },
    ocean: { title: "מסע בים", template: "{child} מצא/ה בקבוק עם מפה עתיקה..." },
    jungle: { title: "ג׳ונגל מסתורי", template: "בבוקר חמים, {child} נכנס/ה לשביל ירוק..." },
  };

  if (!child?.trim()) return Response.json({ error: "חסר שם ילד/ה" }, { status: 400 });
  if (!TOPICS[topic]) return Response.json({ error: "נושא לא חוקי" }, { status: 400 });

  const t = TOPICS[topic];
  return Response.json({
    topicTitle: t.title,
    story: t.template.replace("{child}", child.trim()),
  });
}
