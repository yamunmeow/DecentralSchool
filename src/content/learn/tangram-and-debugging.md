---
title: "Tangram And Debugging Use The Same Skill"
description: "Tangram puzzles and finding a bug in code both use one skill: breaking a large unfamiliar problem into small known parts."
date: 2026-01-12
tags: ["tinkering", "debugging"]
---

Tangram puzzles and debugging use the same skill.

## The skill: breaking a problem into known parts

A tangram puzzle gives you 7 pieces and a target shape. You do not see instantly where each piece goes. You look at one section of the target shape. You compare that section to each piece. You find the piece that matches. You repeat this for every section.

This process has a name: decomposition. Decomposition means breaking one large problem into smaller problems you already know how to solve.

Debugging uses the same process. A program with a bug is one large, confusing problem. A programmer does not read every line and guess the answer. A programmer breaks the problem into parts. A programmer checks if a function receives the correct input. A programmer tests one calculation by itself. A programmer removes half the code to see if the bug disappears. Each step breaks the large problem into a smaller, testable problem.

## Rotating and flipping a piece is like changing an assumption

One tangram piece, the parallelogram, requires a flip, not a rotation, to fit some target shapes. Rotating this piece does not make it fit. Flipping the piece is a different action from rotating the piece.

Code has a similar case. A function can be almost correct for a new situation. Changing the input values does not fix the function. The function needs a different assumption, not a different value. Programmers often do not notice this quickly. Recognizing when a problem needs a new assumption, not a new value, takes practice.

## Try it

Open [Tangram](/games/tangram). Break the square apart. Build a different shape instead of the square. Notice when you stop moving pieces randomly and start testing one piece against one section of the shape. This same testing process is used in debugging.
