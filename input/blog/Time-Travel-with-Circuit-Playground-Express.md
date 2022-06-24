Title: Time Travel with Circuit Playground Express
Published: 05/28/2020
Tags: 
  - Circuit Playground
  - Javascript
  - MakeCode
  - Kid Projects
  - Homeschool
Card: /images/time-travel-card.jpeg
---

My 6 year old daughter has been using her imagination to help make homeschool history more fun. She came up with the idea for a time travel helmet that would transport her to early Egypt, Greece and beyond. This past weekend we used a Circuit Playground Express, Microsoft MakeCode and a cardboard box to bring her time travel helmet design to life! This was a fun project for both of us and also a great introduction to coding for my kiddo. 

## The Design

<div class="container-right container-row">
<?# CaptionImage Src="/images/helmet-design.jpg" AltText="a child's drawing of a time travel helmet" Style="container-left"?>Design<?#/CaptionImage ?>

<?# CaptionImage Src="/images/helmet-complete.jpg"  AltText="the completed helmet" Style="container-right"?>Finished Product<?#/CaptionImage ?>
</div>  
My daughter loves to draw, so when I asked her what a time travel helmet would look like she was prepared. She came up with a design, drew it out and explained all of the components. Engineering doesn't always create what the design team has in mind but in this case I think we got pretty close.

We used an old Amazon box and some tape to assemble the helmet, with a length of cardboard run through the middle that serves as the top of the helmet and a shelf for the battery holder. A time travel helmet wouldn't be complete without some noisy, flashy, technical looking time circuits. 

Clearly the _Back to the Future_ movies would have failed if not for the flux capacitor ("which makes time travel possible"). That's where the [Circuit Playground Express](https://smile.amazon.com/Adafruit-Circuit-Playground-Express/dp/B0764NQ1WW/?ref=smi_se_dshb_sn_smi&ein=22-3886094&ref_=smi_chpf_redirect&ref_=smi_ext_ch_22-3886094_cl){rel="noopener" 
target="_blank"} comes in. 

## The "Robot Computer"

Since Flux Capacitor was taken, my daughter named our time travel electronics "the robot computer". I've had a Circuit Playground Express in my laptop bag since I attended Microsoft Ignite back in November (it was handed out for free). The amount of functionality packed into this small device is really amazing, check out the link above for all the details.  

Here is the small subset of features used in our time travel helmet:
<div class="container container-row">
<?# CaptionImage Src="/images/cpx.jpg" Style="container-left"?>Circuit Playground Express<?#/CaptionImage ?>

  *  10 x mini NeoPixels, (for colorful indicator lights)

  *  1 x Motion sensor (LIS3DH triple-axis accelerometer with tap detection, free-fall detection, we used it to stop the time travel process with a shake of the head)

  *  1 x Mini speaker with class D amplifier (to make the time travel sound, of course)

  *  7 pads can act as capacitive touch inputs (we're using pad A3 to turn the time circuits on)

  *  2 MB of SPI Flash storage (we copied code to the device and stored it here)

  *  MicroUSB port for programming and debugging (used this to transfer code)  

</div>
<p></p>

## Supplies
<div class="container container-row">
<?# CaptionImage Src="/images/cpx-battery.jpg" Style="container-right"?>Battery holder<?#/CaptionImage ?>
Aside from the cardboard box and some tape, here are the supplies used in the project:
<p></p>

  * [Circuit Playground Express](https://smile.amazon.com/Adafruit-Circuit-Playground-Express/dp/B0764NQ1WW/?ref=smi_se_dshb_sn_smi&ein=22-3886094&ref_=smi_chpf_redirect&ref_=smi_ext_ch_22-3886094_cl){rel="noopener" target="_blank"}
  
  * [3xAAA Battery Holder](https://smile.amazon.com/Low-Voltage-Power-Solutions-Decorations/dp/B07M7Q4GXN/?ref=smi_se_dshb_sn_smi&ein=22-3886094&ref_=smi_chpf_redirect&ref_=smi_ext_ch_22-3886094_cl){rel="noopener" target="_blank"} 
  
  * [Rechargeable AAA Batteries](https://smile.amazon.com/Energizer-Rechargeable-Batteries-Pre-Charged-Recharge/dp/B000BESLQK/?ref=smi_se_dshb_sn_smi&ein=22-3886094&ref_=smi_chpf_redirect&ref_=smi_ext_ch_22-3886094_cl){rel="noopener" target="_blank"}

The battery holder we used has both the JST type connector for connecting to the Circuit Playground and an on/off switch which is very useful if you accidentally play an annoying sound on an infinite loop. The Circuit Playground itself is attached to the helmet with some spare CAT6 (my kiddo was happy to have a choice of colors for the wire!)  
</div>
<p></p>

> These aren't affiliate links, and I don't make anything off of them. They ARE Amazon Smile links and if you use them Amazon donates a small amount to charities like [She is Safe](https://sheissafe.org/){rel="noopener" target="_blank"}, an organization that prevents, rescues and restores women and girls from abuse and exploitation.

## Block Based Coding with Microsoft MakeCode

[Microsoft MakeCode](https://makecode.com){rel="noopener" target="_blank"} is a (free!) web based code editor. You can use it to write Javascript or Python code for devices from Lego, Cue, Adafruit and others. You can also build using a block based code editor, similar to [Scratch](https://scratch.mit.edu/){rel="noopener" target="_blank"}, which is great for anyone just learning to code or those of us with little patience. 

We opened the MakeCode site in a browser and started a new project for the Circuit Playground Express. MakeCode shows a picture of the device we are coding for - but it's not just a picture, it's a device simulator! We can simulate pushing buttons and shaking the device as we write code and instantly see how it will work on the device.

<div class="container container-row">
<?# CaptionImage Src="/images/makecode-mavis.jpg"  AltText="a child writing code for the first time" Style="container-left" ?>First time coder!<?#/CaptionImage ?>

<?# CaptionImage Src="/images/makecode-blocks.png"  AltText="screenshot of the Microsoft MakeCode interface" Style="container-left" ?>MakeCode Interface<?#/CaptionImage ?>
</div>

We added code blocks to do the following:

* Play a sound when powered on
* Start "time traveling" when a button is pushed (she picked the A3 button)
* Play a sound and strobe the lights until time traveling is stopped (she found a cool animation called "comet" for this)
* Stop time travel when the helmet is shaken

MakeCode made this project so easy and very approachable for both of us! My daughter caught on very quickly and it was easy and intuitive for me to answer any questions she had. Actually I think I asked more questions than she did - questions like "what color lights do you want?". 

Once we had it working the way we wanted, we tried it out on the device simulator and then clicked download. All we had to do was plug the Circuit Playground into the computer with the included USB cable and drag and drop our code file over to the device. At this point it instantly rebooted and started running the code we created!

Another great feature of MakeCode is it allows you to see the code you created with blocks as Javascript. Here's the code we created:

```
input.touchA3.onEvent(ButtonEvent.Click, function () {
    traveling = 1
    while (traveling) {
        light.showAnimation(light.cometAnimation, 100)
        music.playMelody("C5 B A G F E D C ", 900)
    }
})
input.onGesture(Gesture.Shake, function () {
    traveling = 0
    light.clear()
})
let traveling = 0
music.playMelody("C5 B A G F E D C ", 400)
traveling = 0
```

## An Excellent Adventure

Once the code was completed, we attached the Circuit Playground and battery holder to the helmet, switched it on and it was ready to go. I'm really impressed with the Circuit Playground Express. It has a wealth of features, is totally approachable for beginners, and can also be programmed with Circuit Python and Javascript for more advanced use. My daughter will surely come up with some new feature requests for her time travel helmet soon - and I'm looking forward to it! In the mean time, her homeschool history lessons should be much more entertaining.  

<div class="container ">
<?# CaptionImage Src="/images/mavis-helmet.jpg" AltText="a happy child wearing the time travel helmet described above" Style="container-left"?>It's time traveler time!<?#/CaptionImage ?>
</div>

