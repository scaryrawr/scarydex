---
name: ketchup-video
description: "Catch the user up like ketchup, with a short subtitled video of slides about the work and every waiting decision listed below it. Use for /ketchup-video."
---

# Ketchup video

Follow [ketchup](../ketchup/SKILL.md), but show what happened in a short silent, subtitled video instead of its summary and visuals. Start the window at the user's last message before this invocation, not before an earlier ketchup. Writing and rendering the video in an approved scratch folder outside the repo is the only exception to ketchup's read-only rule. Do not capture the screen, generate images, acquire software, or upload files without the required explicit approval.

The reply contains ketchup's opening sentence, the video if the host supports local attachments, one line naming work you can still do yourself, and every waiting action item. When the video shows options, use those same names below it. If rendering or attachment support is unavailable, state the limitation and give the text catch-up and decisions. Never invent an embedded video or public URL.

## Slides

Use screenshots, recordings, diffs, and data the work produced, not prose about them. Before drawing, write the sentence the viewer should remember and one line per slide. Keep those notes out of the reply. Use at most ten slides. Drop any slide that adds no fact.

Each slide makes one point. Change one connected picture across slides instead of showing unrelated pictures. Keep colors and shapes consistent. Show a system, PR stack, before-and-after fix, or side-by-side options. Point at the change with arrows or motion. Do not substitute disconnected text boxes, bullet lists, or status tables.

Put short labels on the things they name. Do not caption what the picture already shows or repeat facts across slides and the reply. Show whether each requested item finished, failed, is still running, or was not checked. Work waiting on the user is not done. If a visible change lacks a screenshot, say so and name the change. Never draw an uncaptured screen or invent a measurement.

## Subtitles

Give each slide one short subtitle, about ten words, stating its point from only what it shows. Explain the picture rather than reading its labels. Use a constant-height strip below the slide, empty except for the subtitle. Make it readable at chat size and never cover the slide.

## Render

Use an already available local renderer to make one silent landscape video with motion between slides. Make frames from the slides, never by recording the screen. Each frame is the slide above its subtitle strip. Burn the subtitle into every frame of the slide's hold. Hold each fully visible slide for at least one second per three added words, excluding transitions and existing screenshot text. Count the subtitle and every new or changed label; the first slide adds all its words.

Before attaching the video, inspect an actual rendered frame per slide at chat size. Confirm the subtitle is readable and unobstructive. Measure each hold by matching rendered frames to the slide, not a still-frame detector that counts faint fade edges. Check added-word counts against those measured holds, correct unreadable slides and render again. Keep evidence local. Video creation does not authorize posting, opening PRs, uploading files or changing product code.
