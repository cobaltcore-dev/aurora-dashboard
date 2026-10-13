---
name: juno-last-known-state
description: "Baseline snapshot of Juno repo state for change detection — component list, UX doc list, last-checked date. Updated by daily cron and session-start checks."
metadata:
  node_type: memory
  type: project
---

## Last checked

2026-10-12 (Changes detected: 3 components added, 2 removed, 21 modified; 2 UX docs added, 8 modified. See change log below. 105 components, 42 UX docs in new baseline.)

**How to apply:** If last-checked date is absent or older than 24 hours, run the full change-detection protocol before starting any Juno task.

---

## Change-detection protocol

On every check:

1. `🔍 Fetching: https://api.github.com/repos/cloudoperators/juno/contents/packages/ui-components/src/components`
   - Parse the `name` and `sha` fields from each entry.
   - Compare against the stored component list below.
   - Flag: any new name (added component), any missing name (removed component), any changed sha (modified component).

2. `🔍 Fetching: https://api.github.com/repos/cloudoperators/juno/contents/docs/ux`
   - Parse the `name` and `sha` fields from each entry.
   - Compare against the stored UX doc list below.
   - Flag: any new file, any removed file, any changed sha.

3. If changes detected: output a visual diff report (see format below) before proceeding.
4. **Reconcile hard-rejects:** if any component or UX-doc sha changed, lift the matching hard-rejects. Run `reconcile_hard_rejects(changed_names)` from `juno-review-server.py`, or drop entries in `juno_review_store.json` (`hardRejected`) whose `sb`/`ux` name is in the changed set, so the dismissed finding can surface again. See [[project-juno-review-store]].
5. **Write on-page changes:** append every added/removed/modified component or doc to `juno_changes.json` (see [[project-juno-sync-mechanism]]) so the hub's "Recent Juno changes" panel surfaces it. Dedupe by `id` (`kind:name:newSha`), preserve `seen` on entries already present, and update `lastChecked`. A no-change run only updates `lastChecked` and leaves prior unseen entries in place. Entry shape: `{id, kind:"component"|"ux", name, status:"added"|"modified"|"removed", oldSha, newSha, summary, url, date, seen:false}`.
6. Update this file with the new state and today's date.

### Visual diff report format

```
╔══════════════════════════════════════════════════╗
║  JUNO REPO CHANGES DETECTED — [date]             ║
╚══════════════════════════════════════════════════╝

COMPONENTS  (packages/ui-components/src/components/)
  ✅ ADDED     NewComponentName
  ❌ REMOVED   OldComponentName
  ⚠️  MODIFIED  ChangedComponentName  (sha: abc123 → def456)

UX DOCS  (docs/ux/)
  ✅ ADDED     new-pattern.md
  ❌ REMOVED   old-pattern.md
  ⚠️  MODIFIED  modals.md  (sha: 111aaa → 222bbb)

No changes: [N] components, [N] UX docs unchanged.
```

If nothing changed, output:
```
✅  Juno repo unchanged since [last-checked date]. [N] components, [N] UX docs — all shas match.
```

---

## Known component list

| Component name | sha |
|---|---|
| AppBody | 8a16c97d7ad2345ff781913e2aca4891cb945716 |
| AppShell | b819b9c6bbe9b8180d2ddba56c58fba488129a31 |
| AppShellProvider | 213dc0e40c8105d961e28a87b67df2c958058f17 |
| Badge | bd828655cbbfc5c0e57c068f2b98272ca9ef6825 |
| Box | 20f0b7118e761ae73443ce33485d5b6f432bc637 |
| Breadcrumb | 025dd0c332e3b8202f2fc4cfbb9f1fb36ae6e71c |
| BreadcrumbItem | 5d09785ec62b64dcf6f8859716501f46fa7d6d58 |
| Button | d6549d5cbe1486eed993cdab59c6b14ec324df79 |
| ButtonRow | 6612bd40da5cd1c7b57af14e0e2270362502a56e |
| Card | 94c1a28045a4d9c3fcc3dc3e2f90ae9bdbc4b2bd |
| Checkbox | dcf313121ffc4795e04f675395e4dcf2f308935f |
| CheckboxGroup | 3d962d08cd09b203c9e6e8645798a2286f5669d2 |
| Code | 61175a4c73da8ae03a57f9241a168d811d2a9bf1 |
| CodeBlock | fa73d55dddd44ee642bf8653b344c48acfdfa331 |
| CodeBlockFooter | 7d97633a5a03267b7fa8de4d8585acd23493b22b |
| ComboBox | 169a59654e1301bf7d25dafff68e0575542c375d |
| ComboBoxOption | 055b80002eaf5c0ffc4983b79068d6af344f9917 |
| Container | 8c6deceb4db50a6e65cfdfc3f40c1e1624d31730 |
| ContentAreaToolbar | 64eecc3e268cc85a0e35fed30688b681f99ff2e3 |
| ContentContainer | 402046119e9944a8c01aa4fa19a6877d98cceee5 |
| ContentHeading | d87ca6b07e548ad7c0827e0213331e80eff09843 |
| DataGrid | a21a601606d9e6fd879a6092c4fec9f21b60d370 |
| DataGridCell | 2ddffc28506e6cd0a1780fd8b8e95a5fafe1f2be |
| DataGridFoot | 84d1c940c447b1df32830f5bfb814aa4339d5dcd |
| DataGridHeadCell | 245019da80e1e845af447648f96ed378f1e07cac |
| DataGridRow | c648d7694900dd2c7866f34a3d5c45a1d77acb6c |
| DataGridToolbar | 8ca1496bb55b6c7fd97d0428b8795216c5ce2044 |
| DateTimePicker | d586122444d58c4f7a8c813b0a2894aa283ec553 |
| DescriptionDefinition | f7a52a23ba5f6b3072e3f782599338b42e078453 |
| DescriptionList | 72119d1be1ef78b896d620c9278983fc41333e5a |
| DescriptionTerm | 9f17f0b45e17d10e88c341447e10ba4798b27229 |
| Divider | e8765ac773dfd8db35828d447b80b0d9c2561b91 |
| Form | 69b927535a4fcd40f68254a03bac9d8401515960 |
| FormHint | 3d915c6e148bc4087a41de14c6a44d98afadd66d |
| FormRow | e208fbd285e7be9a37f9c6ad46ef53087e04086e |
| FormSection | aa77a3c7a57c977df3924d6d7a00104ac0caf90a |
| FormattedText | efbba00fc1d2005275044eee6ddd530221e4b6fc |
| Grid | 3862ae982db0191c0b9e917c2bced5aad397166c |
| GridColumn | efeb822d80976060545bef85a0ba67ff75d16bad |
| GridRow | 8477e4765cf5e3d3ccd95f7bbaca5dc06f0c4b83 |
| HeaderContainer | c98fae5ef4f38b00c51a6c6e338f8c9c04e57708 |
| Icon | e06466d51076ef619c8229b7fd048108f7c41d9e |
| InputGroup | c73f2b3383b22654e5bdb37e1d275340386312e5 |
| IntroBox | 34b7765610f6be068eb751ba07bacfa1a399fe85 |
| JsonViewer | be1e87b0bbb84b6dd34cff47000f2b77d26e0e8e |
| Label | d19e231dcdb0ec8d9c4948b8f864b6e94bf88fb7 |
| LoadingIndicator | 230b1af7f73943c55f10fe9b1c869288eae4f4f2 |
| MainContainer | b30f08d81e6baae6776107c590801fcac5339b5f |
| MainContainerInner | 0e63e1998d76ac77f24db53d441bcc402599fee2 |
| MainTabs | 3f5e041aafb454c8995e8d39ad25cefa6a2142a0 |
| Message | d7b4d5ac1b6c45424f87990986f9e28b595a73b0 |
| Modal | 877fd355b13f5e419968108d177cf071cff6f476 |
| ModalFooter | 318c36d232e033da7c8bee2cf1f33ca56f2723c6 |
| NativeSelect | 287412f4b573841616ecca62f222fdf268feb4e8 |
| NativeSelectOption | 96d0d83f843ff1a07a38488d63c21d90026240cb |
| NativeSelectOptionGroup | 1090aa0baa5fd8c479d84b33e4800b9e315c8b68 |
| Navigation | d83906785411671d2b3dbfcf8c687cd36c3e69d1 |
| NavigationItem | 256435d60bf255c442638347eeb5868553cb06de |
| NotificationManager | 7bce6684af61eda9a67891abe2eb137eb26e9b98 |
| PageFooter | 7b04f1b028e8d11a29be1ec1efc9df08972c50c7 |
| PageHeader | e0a7e1d9f36328d2a19fb3db44cd166d0bb3210a |
| Pagination | 719b663b0fa09a960442e7a937d6701e610bc35f |
| Panel | a3b7dcec0269ac7b5ba6a66041e789d2f913b738 |
| PanelBody | 1c77b68e5018a3fc722d4d1b3ef5174dbe13f321 |
| PanelFooter | 8535939c8bd70ebbd3183746fbc66cd1ea469132 |
| Pill | 78b8516fac865caa4f0b71c675a146b8a3459e14 |
| PopupMenu | 21c32672eee4ac04279c95a67b08d904357967db |
| PortalProvider | cffac7432600d20a11afc92d330f952e75f45c5b |
| ProgressBar | 3a37e835c2eee44952725ae244a7fc652e93f257 |
| Radio | fb08a3d2a235b5376fc7ab85066b5fba0a93545b |
| RadioGroup | b4c1f181983af20a43b5d8040a96fecd17613e31 |
| SearchInput | 2c578a5494fcafa5996f5f09f360ed1ce6579aac |
| SecretText | e5f1c4ad1dff4787530a9a2726697ecd9763d59f |
| Select | 95f104639439a032015fad1b1d6b2f334c2f5e01 |
| SelectDivider | 8d3d3ba6eb44bcbdcb274963a0905ec1c3275b22 |
| SelectOption | 36ee466a16a0973af49053776f9386ec34d1f618 |
| ShadowRoot | 80e68281c3b7ac479607fefa06777c7cea671433 |
| SideNavigation | dfe8ff5c975aeb3885a13045402ffd951a7defab |
| SideNavigationGroup | f34cb0f08abcdf98be2a79698ef6824af4793df6 |
| SideNavigationItem | 039f8dd82d3f7bdcce3b262ed7e3efe80dd243b2 |
| SideNavigationList | 2e2461afc60897cfb513cc64ce4701856a2c599c |
| SignInForm | eb9c760c297dd3781173410fc80d3cc34cdb555e |
| SortButton | 703fc6a4064fece78992c18032c5af5d41de7253 |
| Spinner | 0b0bc4d09a8c4218f4fe0e8a5154025e8f7f6f62 |
| Stack | ecf69887aabd744b42cdef25f03b04546727b435 |
| Status | 229de51f00b9cb922fcb880e7108aefe0924467f |
| StyleProvider | e6f30390f8a5183752a5e21438ca81dd81afe4d7 |
| Switch | dc01f0fa63dc2a4ed91a1ac035fe7ac7a05870fd |
| Tab | 7e2b912481ce74e8747522ccb49efd82ebac1048 |
| TabBar | b8b5906627bed132c0933d35c0df8c831245e953 |
| TabBarItem | 3c8d20c44f3c37af8c5185080e2aba3050a44c23 |
| TabList | e8c1eea2b4550836c15e52cbaef3ede23d202d66 |
| TabPanel | 0ccf8d82551d038f566846e89261e8d0396da8aa |
| Tabs | 97c036815031fa9b57c3357b578f52e1fbad0435 |
| TextInput | 0bb042ffaaea9a9ebdf384049a3d2c61466194ff |
| Textarea | 1aa3e19cd52522b59ac4dbe31152ea5b90fe3100 |
| ThemeToggle | 280644f836fadb80db190952a7daf0933a972c72 |
| Toast | cc3127d2e82bf45135befecd8d85b07120e85a7a |
| ToggleButton | e73cddf0961d049d87039f1cf2730309200de6a0 |
| Tooltip | a2f0b9adca32ef6e507350ac452ac5ab748539ee |
| TooltipContent | ff963f242c2404be0d40afd682114f54cfba6854 |
| TooltipTrigger | cc34ff9914d5ed5207e9a2d6ce295f8a423e5dc1 |
| TopNavigation | 9b7cec74fea3e068a1cbed980e0d3c9c075911c6 |
| TopNavigationItem | 36c4bfb39ae82822ffc37d3e3012583d14149d74 |
| withDeprecationWarning | 05ebad76c151927c99269a589ecc857f83704a95 |

---

## Known UX doc list

> The `docs/ux` listing also returns an `images/` directory (doc assets, tree sha varies as images are added). It is not a UX doc — ignore it in the diff and exclude it from the doc count. Only `.md` files are tracked below.

| Doc file | sha |
|---|---|
| 0_contents.md | fdca4b1ff3f3e4114dc291dc5ad313ed76a0cf41 |
| accessibility.md | 65eb0fe07be422a43c37595ea5e047e149d5af5f |
| application-design-guidelines.md | 807729e7501dbce77efdceae751ce77b0f848766 |
| authentication-and-access.md | 22fffd0a017c53db385378b7bd9759640f944f1c |
| box.md | fa911450dd2f756505842c4834fd64de2014e94a |
| core-concepts.md | e3efe94b92b6c4f901eb02953a80ef353dee46c3 |
| datagrid.md | b509ee57931537f805b909df7f03e68f47aed631 |
| embedded-application-layout.md | feb416e6d5aed246c9bada255efa95464d7ade34 |
| error-handling-loading-empty-states.md | a9dd14a5d48a08ba4142b47be40513f45214c117 |
| forms.md | 6371f9e0cdee9a9aa17e1b3d7780a2328757abc4 |
| foundations.md | 7db4505163d763d33115ec2665920aaf4d64ddaa |
| getting-started-with-juno-ui-components.md | 2e147baef842091dec8be60da14723c6b2f493a2 |
| glossary.md | 8b6dc0f43a099b729b3f43a3e587a5c27dad1092 |
| inline-adding-editing-and-deleting.md | b81e90a679d074b56f6030d474f2088546622d71 |
| interaction-guidelines.md | d253744e8e020aac494f424c9859c1b4f7332e28 |
| introduction.md | 23d953d467b03064a2a62dcaf78796e5d05b34f7 |
| juno-layout.md | 61a2778e98bd9e09da74cae4c8a1dbcc2148dc8f |
| layout-and-application-structure.md | 1f24910f955bc401c95e19bdcefbe571dc02dded |
| layout-fundamentals.md | 84b5c8975f40002c0068ee3c959a503bcabf6421 |
| legacy-application-layout.md | 8516656e0808b89b5c53106d9a9f74523e4b1fda |
| messages-and-notifications.md | 09e3043aef30cb3dc6172fb036f1a961940d6fc3 |
| modals.md | f3d7a9f102c830a9e9c3ad4d115944677c9e4cc2 |
| navigation-fundamentals.md | f5a32ce282980e34a7486ef02d396c8e58ae482f |
| navigation-side-navigation.md | 1d537f39de3eaaad6396f3f3ac53023a36fe615d |
| navigation.md | ba1f2dd93f80c883f9a82d9b2e15483c212b5935 |
| page-and-user-flow.md | 027a4fa9e5e0aa1b29c4ae42392ecfaffe4dc86e |
| page-content-area.md | 215de6cce0416844610a591db56fc2e2bd7162a5 |
| page-footer.md | 331ba08861652b119971294de6f2d679f85c73f9 |
| page-header.md | b11d6de13e10237ee7428fab4ecf97382e29a036 |
| page-layout-elements.md | 6dcfd5216b8f9ee06f7ddd50491eaee3b40205e2 |
| page-level-actions.md | 8a4b22089026ebae6c3ffbd5a68432aadf7b921e |
| popup-and-overflow-menus.md | 6e5fede668a548ebf4ae964a7eee5082a59b29df |
| resources.md | 0fb5905303086bf4cb90252fa1fefca604fab535 |
| semantic-variants.md | bb6c73fb9e8e22cd813c41cd5109687df1589384 |
| sign-in.md | c36c36c3b10004c390e8f02e4ab89bcdcde4ec4d |
| the-appshell.md | e1b8692213cba98b4d79a9d28c506d43ddf29fb1 |
| transient-states-and-progress.md | 38dd194b333097b29bcbed8d5d8d0bdd9484f161 |
| ui-for-unauthorized-users.md | afa050ba4c14fc9c4a752897455019262f2f4f3b |
| ux-patterns.md | a427d310a0f0851084b08508f229abb7ac28bff7 |
| ux-writing-content-design.md | 84cd60e1362c2e26522947d43e6806c8bb922f87 |
| versioning-and-deprecation-policy.md | d296888eb6d4379a0a87df9333c8021d781d589b |
| wizard.md | 509c7aae2730fb61cb65efb99267310379ba3393 |

---

## Change log

| Date | Type | What changed |
|---|---|---|
| 2026-09-21 | INIT | First run — baseline established. 101 components, 40 UX docs indexed. |
| 2026-09-23 | CHECK | Daily cron run. No changes — all 101 component shas and 40 UX doc shas match baseline. |
| 2026-09-24 | CHECK | DataGrid sha changed (7e7e2a43 → a21a6016): Storybook header composition-story fix, PR #1995 (2026-09-23). No API/prop change. All other shas match. |
| 2026-09-25 | CHECK | datagrid.md guidance updated (c0c03ce4 → 74a73c6c): boolean columns may use Badge/Pill or plain "Yes/No" / "Enabled/Disabled" text (PR #2004). NativeSelectOptionGroup (9cc72563 → 1090aa0b) + NotificationManager (ce55dcf8 → 7bce6684): test-file-only changes from React 19.3.0 / Storybook 10.6.0 deps upgrade (PR #1999); no API/prop change. |
| 2026-09-28 | CHECK | popup-and-overflow-menus.md rewritten (415a2884 → f377335a, PR #2006): menu items no longer sorted alphabetically — order by importance/frequency ("View" first, destructive last); "destructive" now defined (Delete/Wipe are, Remove/Revoke/Disable are not); grouping only when it aids scanning. PopupMenu (545f155c → 98d3e9e7): stories-only from same PR, no API change. SearchInput (16c9190f → 2c578a54, PR #2011): icon-wrapper CSS vertical-centering fix, no API/prop change. Note: docs/ux listing includes an `images/` asset directory — not a doc, never baselined, excluded from counts. |
| 2026-09-28 | CHECK | No-change re-run. All 104 component shas and 40 UX-doc shas match baseline. |
| 2026-09-29 | CHECK | InputGroup changed (b2fbcb79 → c73f2b33, PR #2017 "InputGroup easy fixes", 2026-09-28): `role="group"` added to the wrapping Stack (a11y), `InputGroupProps` type now exported from index.ts, and a CSS selector typo fixed (`.juno-button-default-primary-danger` → `.juno-button-primary-danger`) so adjacent primary-danger buttons no longer render a double border. No new props / no breaking API change. All other shas match. |
| 2026-10-12 | CHECK | Major update. Components: ProgressBar added (PR #1983); TabBar + TabBarItem added (renamed from TabNavigation + TabNavigationItem, deprecated re-exports still work, PR #2019); Badge updated with onClick/href interactive states (PR #1965); ComboBox controlled value clearing bug fix (PR #2030); AppShell/Modal/Navigation/NavigationItem/Pagination/SecretText/Select/SelectOption/DateTimePicker/TopNavigation/TopNavigationItem test-file-only (vitest 5.0.0 upgrade, PR #2044). UX docs: interaction-guidelines.md added (PR #2063); page-level-actions.md added with toolbar composition rules (PR #2076); ux-writing-content-design.md CRITICAL — empty/unknown values must use "- -" (two hyphens + space), em/en dashes banned (PR #2071); forms.md improved a11y guidance (PR #2049); datagrid.md AI-oriented header composition text added (PR #2046); popup-and-overflow-menus.md further updated. New totals: 105 components, 42 UX docs. |
