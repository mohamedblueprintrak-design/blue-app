// Generate suggested follow-up replies based on AI response content
export function generateSuggestedReplies(content: string, isAr: boolean): string[] {
  const lower = content.toLowerCase();
  const suggestions: string[] = [];

  if (/project|مشروع|مشاريع/.test(lower)) {
    suggestions.push(isAr ? "أظهر التفاصيل الكاملة للمشروع الأول" : "Show full details of the first project");
    suggestions.push(isAr ? "ما هي نسبة الإنجاز الإجمالية؟" : "What is the overall progress rate?");
  }
  if (/task|مهم|مهام|overdue|متأخر/.test(lower)) {
    suggestions.push(isAr ? "اعرض تفاصيل أول مهمة متأخرة" : "Show details for the first overdue task");
    suggestions.push(isAr ? "كيف يمكن تقليل التأخيرات؟" : "How can we reduce delays?");
  }
  if (/invoice|budget|financial|فاتور|ميزاني|revenue|payment|مالي/.test(lower)) {
    suggestions.push(isAr ? "ما هي الفواتير المتأخرة التي تحتاج متابعة؟" : "Which overdue invoices need follow-up?");
    suggestions.push(isAr ? "أظهر مقارنة المصروفات بالإيرادات" : "Show expenses vs revenue comparison");
  }
  if (/alert|تنبيه|warning|خطر|risk/.test(lower)) {
    suggestions.push(isAr ? "ما هي خطوات المعالجة المطلوبة؟" : "What are the required action steps?");
    suggestions.push(isAr ? "أنشئ خطة طوارئ لهذه التنبيهات" : "Create an emergency plan for these alerts");
  }
  if (/improve|تحسين|suggestion|اقتراح|recommend/.test(lower)) {
    suggestions.push(isAr ? "أعطني خطة تنفيذية لهذه الاقتراحات" : "Give me an action plan for these suggestions");
    suggestions.push(isAr ? "ما الأولويات الموصى بها؟" : "What are the recommended priorities?");
  }
  if (/employee|موظف|hr|team|فريق/.test(lower)) {
    suggestions.push(isAr ? "ما هو عبء العمل الحالي لكل قسم؟" : "What is the current workload per department?");
  }
  if (/site|موقع|visit|زيارة|defect|عيب/.test(lower)) {
    suggestions.push(isAr ? "ما هي العيوب الحرجة التي تحتاج اهتماماً؟" : "What critical defects need attention?");
  }
  if (/contract|عقد/.test(lower)) {
    suggestions.push(isAr ? "أعرض العقود قريبة الانتهاء" : "Show contracts near expiration");
  }

  // Default suggestions if none matched
  if (suggestions.length < 2) {
    suggestions.push(isAr ? "هل يمكنك توضيح أكثر؟" : "Can you elaborate more?");
    suggestions.push(isAr ? "أعطني أمثلة عملية" : "Give me practical examples");
  }

  return suggestions.slice(0, 3);
}
