import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";
import starlightVersions from "starlight-versions";

export default defineConfig({
  site: "https://axiomantic.github.io",
  base: "/llmlingua-2",
  integrations: [
    starlight({
      title: "llmlingua-2",
      description: "Node-native LLMLingua-2 prompt compression via @huggingface/transformers.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/axiomantic/llmlingua-2",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/axiomantic/llmlingua-2/edit/main/docs/",
      },
      plugins: [
        starlightTypeDoc({
          entryPoints: ["../src/index.ts"],
          tsconfig: "../tsconfig.json",
          output: "reference/api",
        }),
        starlightVersions({
          versions: [{ slug: "0.1" }],
        }),
      ],
      sidebar: [
        { label: "Guides", items: [{ autogenerate: { directory: "guides" } }] },
        {
          label: "Reference",
          items: [{ label: "Overview", link: "/reference/overview/" }, typeDocSidebarGroup],
        },
      ],
    }),
  ],
});
