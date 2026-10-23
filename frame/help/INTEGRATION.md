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

2. One idea per paragraph, the subject in bold, in the order of use; the screen's own words (button and field labels
   exactly as on screen); no developer vocabulary.
3. Tell the help agent (through the ergonomics session): it translates into `en`, `de`, `es`, reviews, and rebuilds.

## 2. Nothing else to do in the module

- The frame draws the folded panel at the top of the module as soon as the chapter is in the manual. `meta.help: false`
  hides it.
- `ctx.help.open('<subject>')` opens the panel at a paragraph (for a "?" next to a hard field, for instance);
  `ctx.help.link()` gives the address of the chapter.
- Changing `fr.md` later: the build reports the translations "to translate again"; tell the help agent.

## 3. Build and check

```bash
python frame/help/build_help.py
```

It writes `frame/help/pilot.<lang>.md`, refuses a missing language, and lists the modules without a chapter.
