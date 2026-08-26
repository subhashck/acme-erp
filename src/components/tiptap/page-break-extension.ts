import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'hr[data-page-break="true"]',
      },
      {
        tag: "hr.page-break",
      },
      {
        tag: 'div[data-type="page-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "page-break-divider",
        "data-type": "page-break",
        "data-page-break": "true",
      }),
      [
        "span",
        { class: "page-break-pill" },
        "✂ Page Break — New Flipbook Page",
      ],
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const { $to } = selection;

          return chain()
            .insertContentAt($to.pos, {
              type: this.name,
            })
            .focus()
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setPageBreak(),
    };
  },
});
