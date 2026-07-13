import React from "react";

import  Nav  from "@/components/publicUi/nav";
import Footer from "@/components/publicUi/footer";

function layout({ children }) {
  return (
    <>
      <Nav></Nav>
      {children}
      <Footer/>
      
    </>
  );
}

export default layout;
