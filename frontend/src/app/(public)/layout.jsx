import React from "react";
import { ViewTransitions } from "next-view-transitions";
import Nav from "@/components/publicUi/nav";
import Footer from "@/components/publicUi/footer";

function layout({ children }) {
  return (
      <>
          <ViewTransitions>
              <Nav></Nav>
              <main className="flex-1">{children}</main>

              <Footer />
          </ViewTransitions>
      </>
  );
}

export default layout;
