import { expect,it } from "vitest";
import { academicInput } from "../src/lib/academic-validation";
import { normalizeGradeName } from "../src/lib/grade-name";
it("normalizes standard grade spacing and casing",()=>{
  for(const value of ["Grade10","Grade 10"," grade   10 ","GRADE\t10"])
    expect(academicInput.parse({kind:"grades",name:value}).name).toBe("Grade 10");
  expect(normalizeGradeName("grader")).toBe("Grade R");
});
it("preserves custom grades and does not normalize other record names",()=>{
  for(const value of ["Reception","Year 10","Grade 1 0","Grade 10 Advanced"])
    expect(normalizeGradeName(value)).toBe(value);
  expect(academicInput.parse({kind:"subjects",name:"Grade10"}).name).toBe("Grade10");
});
