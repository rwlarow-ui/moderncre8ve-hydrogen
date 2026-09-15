import { forwardRef } from "react";
import { createSchema, type SectionComponentProps } from "~/page-builder";

interface InformationItemProps extends SectionComponentProps {
  // allowMultiple: boolean;
}

const InformationItem = forwardRef<HTMLDivElement, InformationItemProps>(
  (props, ref) => {
    let { children, ...rest } = props;

    return (
      <div ref={ref} {...rest}>
        {children}
      </div>
    );
  },
);

export default InformationItem;

export const schema = createSchema({
  type: "information--item",
  title: "Information Item",
  settings: [
    {
      group: "Content settings",
      inputs: [
        // {
        //   type: "switch",
        //   name: "allowMultiple",
        //   label: "Allow multiple open",
        //   defaultValue: true,
        // },
      ],
    },
  ],
  childTypes: ["paragraph"],
  presets: {
    children: [
      {
        type: "paragraph",
        content: "Email",
        alignment: "left",
        width: "full",
      },
      {
        type: "paragraph",
        content: "support@archercommerce.com",
        alignment: "left",
        width: "full",
      },
    ],
  },
});
