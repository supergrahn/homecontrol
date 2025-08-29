import { __test__ } from "../workload";

describe("workload heatmap parity helpers", () => {
  it("exports computation helpers", () => {
    expect(typeof __test__.computeWorkloadHeatmap).toBe("function");
    expect(typeof __test__.computeWorkloadAgg).toBe("function");
  });
});
