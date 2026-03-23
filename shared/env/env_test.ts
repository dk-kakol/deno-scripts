import { assertEquals, assertThrows } from "@std/assert";
import { getEnv } from "./env.ts";

Deno.test("getEnv returns the value when the variable is set", () => {
  Deno.env.set("TEST_VAR_PRESENT", "hello");
  assertEquals(getEnv("TEST_VAR_PRESENT"), "hello");
  Deno.env.delete("TEST_VAR_PRESENT");
});

Deno.test("getEnv throws when the variable is missing", () => {
  Deno.env.delete("TEST_VAR_MISSING");
  assertThrows(
    () => getEnv("TEST_VAR_MISSING"),
    Error,
    "Missing required environment variable: TEST_VAR_MISSING",
  );
});

Deno.test("getEnv throws when the variable is an empty string", () => {
  Deno.env.set("TEST_VAR_EMPTY", "");
  assertThrows(
    () => getEnv("TEST_VAR_EMPTY"),
    Error,
    "Missing required environment variable: TEST_VAR_EMPTY",
  );
  Deno.env.delete("TEST_VAR_EMPTY");
});

Deno.test("getEnv error message mentions the variable name", () => {
  Deno.env.delete("MY_SECRET_KEY");
  assertThrows(
    () => getEnv("MY_SECRET_KEY"),
    Error,
    "MY_SECRET_KEY",
  );
});
