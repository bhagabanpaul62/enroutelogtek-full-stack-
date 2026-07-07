import React from "react";

import  Nav  from "@/components/publicUi/nav";

function layout({ children }) {
  return (
    <>
      <Nav></Nav>
      {children}
    </>
  );
}

export default layout;
