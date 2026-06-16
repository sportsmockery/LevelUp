"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/pafa/ui/Accordion";

export default function FaqAccordion() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>{/* COPY: faq question */}</AccordionTrigger>
        <AccordionContent>
          <p>{/* COPY: faq answer */}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
