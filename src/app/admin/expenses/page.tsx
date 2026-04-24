import { getExpenses, createExpense, deleteExpense } from "@/app/actions/expense-actions";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { category?: string; page?: string };
}) {
  const data = await getExpenses({
    category: searchParams.category,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  });
  return <ExpensesClient {...data} currentCategory={searchParams.category} />;
}
