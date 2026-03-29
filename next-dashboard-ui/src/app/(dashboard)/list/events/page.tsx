import EventSection from "@/app/components/EventSection";

export default function EventListPage() {
  return <EventSection role="admin" canManage={true} title="Admin Event Center" />;
}