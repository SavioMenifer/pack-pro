export class TripContext {
  constructor() {
    this.destination = null;
    this.durationDays = null;
    this.travelMode = null;
    this.luggageAvailable = [];
    this.packingStyle = null;
    this.activities = [];
  }

  isReadyForPacking() {
    return !!(this.destination && this.durationDays && this.travelMode);
  }

  update(details) {
    if (details.destination !== undefined) this.destination = details.destination;
    if (details.durationDays !== undefined) this.durationDays = details.durationDays;
    if (details.travelMode !== undefined) this.travelMode = details.travelMode;
    if (details.luggageAvailable !== undefined) this.luggageAvailable = details.luggageAvailable;
    if (details.packingStyle !== undefined) this.packingStyle = details.packingStyle;
    if (details.activities !== undefined) this.activities = details.activities;
  }
}
