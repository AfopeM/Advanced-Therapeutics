export interface TemplatePill {
  key: string;
  label: string;
}

export interface Template {
  id: string;
  name: string;
  /** Tailwind classes for the badge pill */
  badgeClass: string;
  pills: TemplatePill[];
  script_text: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "device_confirmation",
    name: "Device Confirmation",
    badgeClass: "bg-blue-100 text-blue-700",
    pills: [
      { key: "patient_name", label: "Patient Name" },
      { key: "patient_first_name", label: "Patient First Name" },
      { key: "doctors_name", label: "Doctor's Name" },
      { key: "body_part", label: "Body Part" },
      { key: "device", label: "Device" },
      { key: "delivered_date", label: "Delivered Date" },
    ],
    script_text: `SPIEL:
Hi! This is [User] with Advanced Therapeutics! Am I speaking with [patient_name]?

Hi, [patient_first_name]! I'm calling about the [device] for your [body_part] that Dr. [doctors_name] prescribed.

We're just reaching out to confirm if the one we delivered to you in [delivered_date] is still working properly or do you need assistance in replacing the device?

If still working:
Great! That would be all for me. I just needed to confirm. But it was great talking to you! Thank you so much for your time, [patient_first_name]. Have a great day!

If no longer available:
May I ask what happened to the device?
This is noted, we're gonna have to check on our end about the replacement. I'll get back to you as soon as we have confirmed the details. Okay?

TEXT TEMPLATE:
Hi [patient_first_name],

This is [User] with Advanced Therapeutics. We're just reaching out in regards to the [device] for your [body_part] that Dr. [doctors_name] prescribed.

We just want to confirm if the one we delivered to you is still working properly or if you need a replacement?

Please feel free to reply to this message or give us a call back at 631-909-6290. Thank you!`,
  },

  {
    id: "sx_center",
    name: "SX Center",
    badgeClass: "bg-purple-100 text-purple-700",
    pills: [
      { key: "patient_name", label: "Patient Name" },
      { key: "patient_first_name", label: "Patient First Name" },
      { key: "doctors_name", label: "Doctor's Name" },
      { key: "body_part", label: "Body Part" },
      { key: "device", label: "Device" },
      { key: "insurance_type", label: "Insurance Type" },
      { key: "sx_date", label: "SX Date" },
      { key: "ps_name", label: "PS Name" },
    ],
    script_text: `SPIEL:
Hi, this is [User] with Advanced Therapeutics. Am I speaking with [patient_name]?

Hi [patient_first_name], this is in regards to the [device] that Dr. [doctors_name] had prescribed for your [body_part].

It's already covered by your [insurance_type] Insurance and we're giving you a call to let you know that the device will be delivered to you in the Surgery Center on [sx_date].

Our product specialist, [ps_name], will be the one to bring it to you. But if you do have any questions any time, feel free to call us at 631-909-6290, okay?

Alright! Well, it was great talking to you! Thank you so much for your time, [patient_first_name]. Have a great day!

TEXT/VM:
Hi [patient_first_name],

This is [User] with Advanced Therapeutics and this is in regards to the [device] that Dr. [doctors_name] had prescribed for your [body_part].

It's already covered by your [insurance_type] Insurance and we're reaching out to let you know that the device will be delivered to you in the Surgery Center on [sx_date].

Our product specialist, [ps_name], will be the one to bring it to you. If you do have any questions any time, feel free to call us at 631-909-6290. Thank you!`,
  },

  {
    id: "wc_call_scheduling",
    name: "WC Call Scheduling",
    badgeClass: "bg-green-100 text-green-700",
    pills: [
      { key: "patient_name", label: "Patient Name" },
      { key: "patient_first_name", label: "Patient First Name" },
      { key: "doctors_name", label: "Doctor's Name" },
      { key: "body_part", label: "Body Part" },
      { key: "device", label: "Device" },
      { key: "address", label: "Address" },
      { key: "insurance_type", label: "Insurance Type" },
    ],
    script_text: `SPIEL:
Hi, this is [User] with Advanced Therapeutics. Am I speaking with [patient_name]?

Hi [patient_first_name], my name is [User] and I'm calling with Advanced Therapeutics regarding the [device] for your [body_part] that Dr. [doctors_name] prescribed. How are you?

That's great to hear! / I'm sorry to hear that.

But/btw we are affiliated with Dr. [doctors_name] that you recently visited to have your [body_part] checked. He prescribed this device to help ease the pain or discomfort you are feeling.

I'm calling to coordinate the delivery so you can begin using this [device] right away to help you feel better, okay?

Okay. I have your address as [address], is that correct?

May we know if you have an apt or unit number by chance?

Do you possibly have any special delivery instructions?

Great! I'll have that noted. You can expect delivery within 1–2 business days. No signature is required upon delivery.

This device is very easy to use. I'll send you a tutorial video that shows you how to use it. Would you prefer it via email or phone number?

Great!

Let me just quickly send that to you. There!

Can you also please confirm if the link is accessible to watch the video while you have me?

Alright! We're all set! Once you receive the [device], you can just go back to this message. But if you do have any questions about setup or anything else, you can reply to my text or give us a call at 631-909-6290. Okay?

Alright! Well, it was great talking to you! Thank you so much for your time, [patient_first_name]. Have a great day! Take care!

TEXT/VM:
Hi [patient_first_name],

This is [User] with Advanced Therapeutics and this is in regards to the [device] that Dr. [doctors_name] had prescribed for your [body_part].

It's already covered by your [insurance_type] Insurance and we're reaching out to coordinate the delivery.

Let me know when it would be best to call you back or feel free to give us a call back at 631-909-6290. Thank you!`,
  },
];

/** Keyed by id for O(1) lookup */
export const TEMPLATES_MAP: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t]),
);

/**
 * Returns the template for a given id.
 * Falls back to a neutral gray badge so unknown ids never crash the UI.
 */
export function getTemplate(id: string): Template {
  return (
    TEMPLATES_MAP[id] ?? {
      id,
      name: id,
      badgeClass: "bg-gray-100 text-gray-600",
      pills: [],
      script_text: "",
    }
  );
}
