# help — how a module gets its help

For the agent of a module. The rules of the help itself are in [SPEC.md](SPEC.md).

## 1. Write the chapter (French)

1. Create `modules/<id>/help/fr.md`:

   ```markdown
   # <Title of the module in the manual>

   One or two sentences: what the module is for.

   ## Comment s'en servir

   **<Subject>.** One idea, what the person does and what happens.

   **<Next subject>.** …

   ## <Other sections, for the manual only>
   ```

   Anchors (rule 16): put `<a id="<module>-<what>"></a>` at the start of the paragraph that describes each **screen or step**
   of the module (`fuel-step-3`, `report-step-2`, `flightlog-list`), or in a title (`## Performance sheets <a id="fuel-sheets"></a>`),
   identical in the four languages and prefixed by the module id. Then publish the current one from the module:
   `ctx.helpAnchor(() => ...)` (`frame/INTEGRATION.md` § 2). The "?" of the header opens the manual at that paragraph and
   highlights it.
2. One idea per paragraph, the subject in bold, in the order of use; the screen's own words (button and field labels
   exactly as on screen); no developer vocabulary.
3. Tell the help agent (through the ergonomics session): it translates into `en`, `de`, `es`, reviews, and rebuilds.

## 2. Nothing else to do in the module

- The frame draws the folded panel at the top of the module as soon as the chapter is in the manual. `meta.help: false`
  hides it. The reader can dismiss it with its ✕ for good (per module, on the device); the chapter then offers "Show the
  first steps again".
- `ctx.help.open('<subject>')` opens the panel at a paragraph (for a "?" next to a hard field, for instance);
  `ctx.help.link()` gives the address of the chapter.
- Changing `fr.md` later: the build reports the translations "to translate again"; tell the help agent.

## 3. Build and check

```bash
python frame/help/build_help.py
```

It writes `frame/help/pilot.<lang>.md`, refuses a missing language, and lists the modules without a chapter.
