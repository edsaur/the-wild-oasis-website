"use server";
import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "../_lib/auth";
import supabase from "./supabase";
import { getBookings } from "./data-service";
import { redirect } from "next/navigation";

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function updateUser(formData) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in!");

  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
    throw new Error("Please provide a valid national ID");

  const updateData = { nationality, countryFlag, nationalID };

  const { data, error } = await supabase
    .from("guests")
    .update(updateData)
    .eq("id", session.user.guestId)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Guests could not be updated");
  }

  revalidatePath("/account/profile");
}

export async function deleteReservation(id) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in!");

  const guestBookings = await getBookings(session.user.guestId);

  const guestBookingsId = guestBookings.map((booking) => booking.id);

  if (!guestBookingsId.includes(id))
    throw new Error("You're not allowed to delete this booking");

  const { data, error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) {
    console.error(error);
    throw new Error("Booking could not be deleted");
  }
  revalidatePath("/account/reservation");
}

export async function updateReservation(formData) {
  // add authentication/guestBookingId check
  const session = await auth();
  if (!session.user.email)
    throw new Error("Please login first to update a reservation!");

  const id = Number(formData.get("booking-id"));
  const numGuests = formData.get("numGuests");
  const observations = formData.get("observations");

  const updatedData = { numGuests, observations, updated_at: new Date() };

  const guestBookings = await getBookings(session.user.guestId);

  const guestBookingsId = guestBookings.map((booking) => booking.id);
  if (!guestBookingsId.includes(id))
    throw new Error("You're not allowed to update this booking");

  const { data, error } = await supabase
    .from("bookings")
    .update(updatedData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Booking could not be updated");
  }

  revalidatePath(`/account/reservations/edit/${id}`);
  redirect("/account/reservations");
}

export async function createReservation(bookingData, formData) {
  const session = await auth();
  // get Form Data
  const newBooking = {
    ...bookingData,
    guestId: session.user.guestId,
    numGuests: formData.get("numGuests"),
    observations: formData.get("observations").slice(0, 1000),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    status: "unconfirmed",
    hasBreakfast: false,
    isPaid: false,
  };
  // apply middleware here


  const { data, error } = await supabase
    .from("bookings")
    .insert([newBooking])
    // So that the newly created object gets returned!
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Booking could not be created");
  }

  revalidatePath(`/cabins/${bookingData.cabinId}`);
  redirect('/reservations/thank-you');
}
