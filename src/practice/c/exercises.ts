export interface TestCase {
  stdin: string;
  expectedStdout: string;
}

export interface Exercise {
  slug: string;
  title: string;
  difficulty: "warmup" | "beginner" | "intermediate";
  prompt: string;
  starter: string;
  tests: TestCase[];
}

export const exercises: Exercise[] = [
  {
    slug: "scratch",
    title: "Scratchpad",
    difficulty: "warmup",
    prompt:
      "No exercise selected. Write anything here and press Run. There is no Check button in this mode -- use Run to just see program output.",
    starter: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
    tests: [],
  },
  {
    slug: "hello-world",
    title: "Hello, World!",
    difficulty: "warmup",
    prompt:
      "Print the exact line `Hello, World!` and nothing else. This is the classic first program in any language -- it checks that your code compiles and runs.",
    starter: `#include <stdio.h>

int main(void) {
    // TODO: print Hello, World!
    return 0;
}
`,
    tests: [{ stdin: "", expectedStdout: "Hello, World!" }],
  },
  {
    slug: "add-two-numbers",
    title: "Add Two Numbers",
    difficulty: "beginner",
    prompt:
      "Read two integers from input (on one line, separated by a space), then print their sum on its own line.",
    starter: `#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    // TODO: print a + b
    return 0;
}
`,
    tests: [
      { stdin: "2 3", expectedStdout: "5" },
      { stdin: "-4 10", expectedStdout: "6" },
      { stdin: "100 250", expectedStdout: "350" },
    ],
  },
  {
    slug: "even-or-odd",
    title: "Even or Odd",
    difficulty: "beginner",
    prompt:
      "Read one integer. Print `Even` if it is even, or `Odd` if it is odd. Use the `%` operator to find the remainder after dividing by 2.",
    starter: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    // TODO: print "Even" or "Odd"
    return 0;
}
`,
    tests: [
      { stdin: "4", expectedStdout: "Even" },
      { stdin: "7", expectedStdout: "Odd" },
      { stdin: "0", expectedStdout: "Even" },
    ],
  },
  {
    slug: "sum-1-to-n",
    title: "Sum 1 to N",
    difficulty: "beginner",
    prompt:
      "Read one integer N, then print the sum of every whole number from 1 to N (inclusive). Use a loop -- do not use the shortcut formula.",
    starter: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int sum = 0;
    // TODO: add up 1 through n using a loop
    printf("%d\\n", sum);
    return 0;
}
`,
    tests: [
      { stdin: "5", expectedStdout: "15" },
      { stdin: "1", expectedStdout: "1" },
      { stdin: "10", expectedStdout: "55" },
    ],
  },
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "intermediate",
    prompt:
      "Print the numbers 1 to 15, one per line. For multiples of 3, print `Fizz` instead of the number. For multiples of 5, print `Buzz`. For multiples of both 3 and 5, print `FizzBuzz`.",
    starter: `#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 15; i++) {
        // TODO: Fizz, Buzz, FizzBuzz, or the number
    }
    return 0;
}
`,
    tests: [
      {
        stdin: "",
        expectedStdout:
          "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
      },
    ],
  },
  {
    slug: "factorial",
    title: "Factorial",
    difficulty: "intermediate",
    prompt:
      "Read one integer N (0 to 10), then print N! (N factorial: N * (N-1) * ... * 1). Remember 0! is 1.",
    starter: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long result = 1;
    // TODO: multiply result by every number from 1 to n
    printf("%ld\\n", result);
    return 0;
}
`,
    tests: [
      { stdin: "0", expectedStdout: "1" },
      { stdin: "1", expectedStdout: "1" },
      { stdin: "5", expectedStdout: "120" },
      { stdin: "7", expectedStdout: "5040" },
    ],
  },
  {
    slug: "reverse-string",
    title: "Reverse a String",
    difficulty: "intermediate",
    prompt:
      "Read one word (no spaces) and print it reversed. Use a `char` array and `strlen` from `<string.h>`.",
    starter: `#include <stdio.h>
#include <string.h>

int main(void) {
    char word[100];
    scanf("%s", word);
    int len = strlen(word);
    // TODO: print word backwards
    return 0;
}
`,
    tests: [
      { stdin: "hello", expectedStdout: "olleh" },
      { stdin: "C", expectedStdout: "C" },
      { stdin: "decentral", expectedStdout: "lartneced" },
    ],
  },
];

export const scratchExercise = exercises[0];
