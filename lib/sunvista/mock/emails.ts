import { IntakeEmail } from '../schemas';

// Seeded inbound requests — realistic Albuquerque commercial property scenarios.
// These feed the Intake Inbox; "Process with AI" parses one into a structured job.
export const MOCK_EMAILS: IntakeEmail[] = [
  {
    id: 'eml-001',
    from: 'tmartinez@desertridgeretail.com',
    fromName: 'Teresa Martinez',
    subject: 'Tenant build-out — Suite 120 Coronado Plaza',
    receivedAt: '2026-06-22T08:14:00Z',
    property: 'Coronado Plaza',
    body: `Hi Irwin,

We have a new tenant taking Suite 120 at Coronado Plaza (2240 Q St NE, Albuquerque) — about 2,400 sq ft of vacant shell retail. They're a coffee + bakery concept and need a full tenant improvement.

Scope as we understand it:
- Build two ADA restrooms
- Rough-in plumbing for a 3-compartment sink, hand sinks, and a water heater
- New 200A electrical panel and lighting throughout
- HVAC: add a 5-ton rooftop unit and distribute ductwork
- Frame and finish a small back-of-house / prep area (~400 sq ft)
- Epoxy floor in the service area, LVT in the seating area
- Storefront signage

Tenant wants to open by mid-September, so we're a little tight on timeline. Can your team put together a budget so we can finalize the lease TI allowance? Roughly what are we looking at?

Thanks,
Teresa Martinez
Desert Ridge Retail Partners
(505) 555-0142`,
  },
  {
    id: 'eml-002',
    from: 'facilities@sandiaofficepark.com',
    fromName: 'Greg Whitlock',
    subject: 'URGENT — RTU failure, Building C 3rd floor',
    receivedAt: '2026-06-22T07:02:00Z',
    property: 'Sandia Office Park',
    body: `Irwin/Debbie,

Rooftop unit #4 serving the entire 3rd floor of Building C (8500 Jefferson St NE) failed overnight. Tenants are calling — it's already 84 degrees up there and climbing. Compressor is locked out, tech on site thinks it's beyond repair (unit is 19 years old).

We need this handled today if at all possible. Please get me an emergency replacement number for a comparable 7.5-ton unit, crane set, electrical reconnect, and disposal of the old unit. Whatever it takes to get cooling back fast.

Greg Whitlock
Facilities Director, Sandia Office Park
(505) 555-0188`,
  },
  {
    id: 'eml-003',
    from: 'owner@mesaverdeplaza.net',
    fromName: 'Daniel Reyes',
    subject: 'Parking lot resurfacing + ADA + landscaping refresh',
    receivedAt: '2026-06-21T16:40:00Z',
    property: 'Mesa Verde Plaza',
    body: `Hello,

I own Mesa Verde Plaza (6100 Coors Blvd NW). The parking lot is in rough shape and I'd like a proposal for:

- Crack seal + 2" asphalt mill and overlay across the main lot (approx 42,000 sq ft)
- Re-stripe with ADA-compliant accessible stalls and signage (we're currently short on accessible spaces)
- Replace ~6 wheel stops and repaint fire lane curbs
- Refresh the landscape islands — remove dead shrubs, new gravel/xeriscape, drip irrigation repair
- Two new LED parking lot pole lights to replace failed fixtures

No huge rush, but I'd like to get it done before the fall. Please send a written estimate when you can.

Daniel Reyes
(505) 555-0210`,
  },
  {
    id: 'eml-004',
    from: 'lwong@nobhilldental.com',
    fromName: 'Dr. Linda Wong',
    subject: 'Office expansion — adding 2 operatories',
    receivedAt: '2026-06-20T11:25:00Z',
    property: 'Nob Hill Professional Building',
    body: `Hi Irwin,

My dental practice at the Nob Hill Professional Building (3424 Central Ave SE, Suite 200) is expanding into the adjacent 600 sq ft suite. I want to add two new operatories and a small sterilization room.

Each operatory needs plumbing for a chair/cuspidor, vacuum and compressed air lines, dedicated electrical, and cabinetry. The sterilization room needs an autoclave hookup and stainless counters. We'd also reconfigure the shared wall and add a door from the existing reception.

Quiet hours matter — we see patients M-Th, so most work would need to be Fridays/weekends. Can you scope and price this? Targeting completion within ~8 weeks.

Thank you,
Dr. Linda Wong
(505) 555-0177`,
  },
];

export function getEmailById(id: string): IntakeEmail | undefined {
  return MOCK_EMAILS.find((e) => e.id === id);
}
