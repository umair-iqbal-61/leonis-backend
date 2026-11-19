# Provisional barn dashboard — Pakistan research

Researched 19 November 2026. The owner approved published research as the basis for a provisional dashboard because interviews are unavailable, accepted support for multiple barns, and explicitly chose both milk-sale and animal-sale income. Complete this milestone before deployment to the existing v1 hosting.

## Evidence and limits

- [SMEDA, Dairy Farm (25 Cows), May 2025](https://smeda.org/phocadownload/Prefeasibility_Studies/Dairy/Dairy%20Farm%2025%20Cows%20Rs.%2050.83%20million%20May-2025.pdf): record keeping on printed page 10; staffing on page 19; feeding/health costs on pages 20–21; utilities, maintenance and milk/calf-sale revenue on page 22. These support broader cost and income categories than the original purchase/feed/vet/transport/sale list. The cover warns that projections and prices vary. Use categories, not its assumed prices, yields, staffing ratios or investment returns, as product inputs.
- [Dairy Hub/Tetra Pak Pakistan, Mechanized Dairy Farming, hosted by UVAS](https://uvas.edu.pk/doc/advisory_services/Dairy-farming/english/14-Mechanized_Dairy_Farming.pdf), printed pages 10–11 (PDF page 7): describes tagged animal identities, individual production records and ongoing income/expense records. It is background guidance, not a current price list or user interview.
- [FAO, Small-Scale Dairy Farming Manual, Dairy Farm Accounting](https://www.fao.org/4/t1265e/t1290e01.htm), pages 5–8: covers transaction descriptions, receipts, milk-sale quantities and distinct capital/recurrent accounts. This supports separating cash movements from profit reporting. It is general accounting guidance, not Pakistan-specific market research.

Published research does not constitute interviews, external usability testing, or proof that a workflow suits every Pakistani farm. No vaccine doses, treatment recommendations, milk rates or projected profit percentages will be imported from these sources.

## Proposed first-release scope

These are Leonis design choices informed by the evidence above, not verbatim source recommendations.

1. **Barns and cattle:** owner-scoped barn name, location and notes; attach existing dairy-cattle records without changing animal IDs. Support several barns with one current assignment per animal. Keep dated transfer history; moving an animal must not move or duplicate old financial entries. Pets remain outside this feature. Buffalo and other livestock types require a separate species extension later.
2. **Income:** milk sales, animal sales and other income. Milk produced remains in the existing production records; milk sold is entered separately. Do not multiply every milk-yield entry by an assumed selling rate or assume all production was sold.
3. **Costs:** animal purchase, feed/fodder, vet/medicine, breeding services, transport, labour, utilities, rent, maintenance, equipment and other costs. An entry belongs to a barn and can optionally identify an animal. Shared costs remain identifiable at barn level; no automatic equal split across animals.
4. **Entry fields:** transaction date, category, PKR amount, barn, optional animal, description and optional receipt reference. Milk-sale entries additionally record sold litres and the actual agreed value. Feed quantities can use explicit kg units. Do not silently convert an owner's local measure into kg or litres.
5. **Payments:** distinguish the agreed amount from dated amounts received/paid. Support unpaid and partial settlements; outstanding amounts are not cash received. Keep these transactions independent of store orders and marketplace listings, which do not prove that a cattle sale was completed or paid.
6. **Reports:** selectable date range; barn summary, animal detail and transaction ledger. Show recorded operating income/costs, cash received/paid, outstanding amounts, and shared costs. Missing data stays unknown instead of becoming zero.

## Report definitions and safeguards

- Net recorded cash movement = dated receipts minus dated payments for the selected period. Includes explicitly recorded acquisition/equipment payments; it is not net profit.
- Recorded operating margin = recorded operating income minus recorded operating expenses. Keep animal acquisition/disposal and equipment movements separately visible. Exclude financing, tax, depreciation and unrecorded costs from this provisional measure, with the exclusion shown beside the figure.
- Per-animal operating figures use directly assigned entries. Display barn-level shared costs separately rather than pretending the animal figures include them. Never sum these per-animal figures and label the result the whole barn's profit when shared costs exist.
- Do not promise a complete net-profit calculation from the first ledger. Acquisition cost, asset values and overhead treatment require explicit inputs and further accounting design. Any displayed estimate must state its included/excluded costs and recording coverage.
- Animal transfers preserve the original barn on financial entries and use dated membership for production summaries. A transfer is not an income/expense transaction.
- Owner edits remain explicit. Do not silently correct source records or infer missing financial values from AI, shop prices or feasibility-study assumptions.

## Implementation order

1. Additive barn, membership-history and financial-entry/payment schema with owner-scoped APIs.
2. Barn list/detail, animal assignment and ledger entry screens in the existing Tailwind/mobile/English/Urdu system.
3. Milk/animal-sale entry and payment workflows; date-range summaries with the definitions above.
4. Tests for ownership, transfers, partial payments, shared costs, unknown inputs, duplicate submissions and exact PKR arithmetic; mobile/RTL report verification.
5. User workflow review before deployment. Interviews can later validate the provisional categories and reporting model without blocking this research-led release.

Implementation update, 19 November 2026: the provisional dashboard is implemented with the additive `20261119010000_barns` migration, owner-scoped APIs, dated assignments, financial entries/payments and English/Urdu reports. Unit tests, isolated PostgreSQL integration checks and browser/PDF verification passed. The owner subsequently confirmed the barn workflow works; the newer Pets/Livestock navigation still awaits owner review. See [implemented behavior and setup](barn-dashboard.md) and [workspaces](workspaces.md).
