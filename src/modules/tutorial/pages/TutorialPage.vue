<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
const guidelineHref = '/docs/internal-patrol-app-guideline.pdf'
</script>

<template>
  <div class="space-y-4">
    <div class="text-[26px] font-semibold text-slate-800">Internal Patrol App Guideline</div>

    <!-- <div>
      <Accordion value="0">
        <AccordionPanel value="0">
          <AccordionHeader>1 - Login</AccordionHeader>
          <AccordionContent>
            <div class="flex flex-col gap-2 items-start">
              <p class="w-[50%]">
                When using Internal Patrol Application, user needs to log in with Internet
                Connection from the first time. This will download all the data for the Offline
                Mode.
              </p>
              <div class="flex flex-row gap-2 items-start">
                <img src="/src/styles/tutorialImg/0.1.png" alt="User Login" class="h-100" />
                <img src="/src/styles/tutorialImg/1.png" alt="User Login" class="h-100" />
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="1">
          <AccordionHeader>2 - Begin Patrol Shift</AccordionHeader>
          <AccordionContent>
            <div class="flex flex-col gap-2 items-start">
              <p class="w-[50%]">
                Patrol Shift Route will show on the application, so the user can see that which
                Route they are going to patrol
              </p>
              <div class="flex flex-row gap-2 items-start">
                <img src="/src/styles/tutorialImg/0.1.png" alt="" class="h-100" />
                <img src="/src/styles/tutorialImg/1.png" alt="" class="h-100" />
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div> -->

    <!-- <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-slate-700">
      Download the Internal Patrol App Guideline file
      <a
        :href="guidelineHref"
        download
        class="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
      >
        here
      </a>
      .
    </div> -->
  </div>
</template>
