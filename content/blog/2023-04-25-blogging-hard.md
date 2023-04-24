+++
title = "Blogging is hard"
date = 2023-04-25
+++

After a bit of a gap, last weekend I've defined the list of activities that I 
want to gradually build on for `sttp://` [^1]. I've put many efforts to create 
this project from scratch and it has not been a sticky experience [^2]. After a few
weeks I find myself re-doing this effort from scratch. There are many reasons 
I couldn't continue writing, and thinking out loud, they would be

- **New shiny tech** - at work I'm a big proponent of "choosing boring tech" [^3].
When it comes to personal side-projects though, they involve the most shiny,
and mostly alpha/beta upcoming-new tech. I'll go to length to say that many side
projects are not born because of an idea/need but because of me trying to link
shiny tech that I discover for an application that I think could mean something.
This means, by the time excitement of exploration ends, I'm already
bored with tech stack and want to abandon it for a new discovery and new 
applied problem

- **Edits to past essays** - I've seen benefit of thinking through writing. It
is also an iterative process for me where I have correct my old writing based on
new learnings. Although, this works well for Architecture Decision Records, but 
it goes against the whole philosophy of blog/posts/essays. Because I keep 
editing same essay/blog again and again, I rarely invest into new ideas with the
attention/curation they require. At one point, curated essay set big
expectations about the new essays and it feels too big a challenge to attempt

- **Keeping at my habits** - This one is bit more hard to change. I'm a 
creature of will and rarely have the discipline required to nurture a habit. 
Writing a blog and curating content requires perseverance and continued effort. 
Blogging is a creative process and requires both a routine and creative freedom.
Additionally, I also have huge learning ahead of me for separating concerns 
between work and personal stuff

There might be more reasons but I they are derivatives of above three majorly.

## Why do I keep coming back to it?

Let me explain this with nerd logic that makes most sense to me.

I met Quantum Physics in the mid-2008. And when you meet Quantum Physics, 
all the primary education starts to make sense. Physics and Chemistry become 
interdependent; mathematical concepts apply and history of many experiments and 
their findings become admirable. It is then, when from reading grammar, I
actually started admiring Physics more. Among stories of discoveries and 
inventions, evolution of Newtonian to Quantum Physics was most enticing. 
Heisenberg's Uncertainty Principle became most relatable. 
Why? - I don't know [^4]. Heisenberg's Uncertainty Principle can be summarized with 
below equation

{{ resize_image(path="static/img/2023-04-25-blogging-hard-uncertainity.png", width=1200, height=200, op="fit_height") }}

Two important measurements that are in the equations are position (represented, 
delta x) and momentum (represented, delta p). Momentum is mass times velocity 
and for the sake of this discussion, let us assume mass is constant [^5]. 
With that assumption, we can concentrating on more appropriate position and 
velocity (and ignore mass) which are related to each other based on above 
equation.

As per principle, its impossible to determine absolute position and 
absolute velocity of a sub-atomic particle at the same time. My interpretation -
if we try to estimate absolute position of a subatomic particle, we will alter
its velocity with the experiment and vice-versa. This applies only for 
sub-atomic particles because Quantum Physics doesn't apply for large objects; 
Newtonian Physics applies for large object. Theoretically, on macroscopic 
levels, the effect of the Uncertainty Principle is not evident or visible.

One area where this logic fails to apply - Life. Our lives is pretty 
macroscopic but Uncertainity Principle is applies all the time.

Another analogy - Life is an endless stream of unstructured events. It is 
difficult to read, write or process without a real-time message queue and 
stream processor. Taking a snapshot of these events and trying to 
aggregate the findings is the best (and most clichéd) way of taking control 
back. Another approach would be to trigger webhooks and save the incoming 
event. Both analogies lead to writing (blogs, notes, or equivalent). I've 
realized the benefits of writing, and its proven as an easy way of going back 
in time to estimate absolute position and velocity. It is logical for me to 
turn towards blogging and note-taking to keep my sanity.

## What's changing in my approach now?

To solve for above, I'm planning small (rather, very small) actions, learning
from work experience; namely,
- Notes != Essays; Essays = Evergreen Notes [^6]
- Don't over-engineer
- Spend innovation tokens wisely
- Break problem/vision in tiny chunks I can chew
- Discipline = Freedom

I'm refraining to expand and keep the points rather succinct. In my view, 
instead of blatantly preaching, I'll try each of the points to the full(est), 
find merit in them and report back.

---

**Footnotes**

[^1]: I've created a new Github Project, to both test out this feature, its 
effectiveness and to breakdown my wishlist and bring a bit of structure to 
the madness. [Link](https://github.com/users/hrmnjt/projects/4/views/1).

[^2]: First time I started a blog was in 2017 for a total of 10 mins 
(exaggeration). In 2019, I recreated the blog with a promise to write one essay 
every week i.e. easy 50 essays in a year - 5 of 50 might be good enough to 
motivate and provide me direction. I wrote a less frequently than planned and 
was very sporadic. Since then I've invested a lot on writing notes but not 
publishing them ever. 

[^3]: Mr. Dan McKinley talks about his learnings from choosing boring tech.
[Link](https://boringtechnology.club/). 

[^4]: {{ resize_image(path="static/img/2023-04-25-blogging-hard-quantum.png", width=1200, height=400, op="fit_height") }}  
Source: [https://xkcd.com/1861/](https://xkcd.com/1861/)

[^5]: The assumption of mass being constant would be invalid when Einstien's 
Relativity Theorem comes to action, which deserves a post in itself.

[^6]: I first learnt about Evergreen Notes when reading through the process 
Maggie Appleton follows in her digital garden - 
[link](https://maggieappleton.com/evergreens). I've since then read the 
original idea as well by Andy Matuschak - 
[link](https://notes.andymatuschak.org/z4SDCZQeRo4xFEQ8H4qrSqd68ucpgE6LU155C).
