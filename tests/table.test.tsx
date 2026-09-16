import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

describe("responsive table", () => {
  it("contains offscreen action labels inside the horizontal scroll region", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <button><span className="sr-only">Edit record</span></button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole("table").parentElement).toHaveClass("relative", "min-w-0", "overflow-x-auto");
    expect(screen.getByRole("button", { name: "Edit record" })).toBeInTheDocument();
  });
});
