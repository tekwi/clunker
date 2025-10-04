import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiStepForm } from "@/components/MultiStepForm";
import { VinScanner } from "@/components/VinScanner";
import { Camera } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [vinInput, setVinInput] = useState("");
  const [showVinScanner, setShowVinScanner] = useState(false);
  const isMobile = useIsMobile();

  // Check for affiliate ref parameter and auto-show form
  useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const affiliateRef = searchParams.get("ref");
    if (affiliateRef) {
      setShowForm(true);
    }
  });

  const handleVinSubmit = () => {
    if (vinInput.length === 17) {
      setShowForm(true);
    }
  };

  if (showForm) {
    return (
      <div className="min-h-screen">
        <MultiStepForm initialVin={vinInput} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-secondary py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-6xl mb-6"><img src="/brand-avatar.png" alt="TrackWala Brand Avatar" class="w-12 h-12 rounded-full"></div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Get Cash for Your Car in 24-48 Hours
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Transparent instant pricing. No haggling. No hassle. <br />
            Same-day to 2-day pickup.
          </p>

          {/* VIN Input Section */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-white rounded-lg p-6 shadow-2xl">
              <label className="block text-left text-gray-700 font-semibold mb-2">
                Enter Your VIN to Get Started
              </label>
              <div className="flex gap-3">
                <Input
                  value={vinInput}
                  onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                  placeholder="Enter 17-character VIN"
                  className="text-lg p-4 h-14 flex-1"
                  maxLength={17}
                />
                {isMobile && (
                  <Button
                    onClick={() => setShowVinScanner(true)}
                    variant="outline"
                    size="lg"
                    className="h-14 px-6 bg-primary text-white border-primary hover:bg-primary/90"
                    title="Scan VIN"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                )}
                {!isMobile && (
                  <Button
                    onClick={handleVinSubmit}
                    disabled={vinInput.length !== 17}
                    size="lg"
                    className="h-14 px-8 bg-primary hover:bg-primary/90"
                  >
                    Get Offer
                  </Button>
                )}
              </div>
              {isMobile && (
                <Button
                  onClick={handleVinSubmit}
                  disabled={vinInput.length !== 17}
                  size="lg"
                  className="w-full h-14 mt-3 bg-primary hover:bg-primary/90"
                >
                  Get Offer
                </Button>
              )}
              <p className="text-sm text-gray-500 mt-2 text-left">
                {vinInput.length > 0
                  ? `${vinInput.length}/17 characters`
                  : "Find your VIN on your dashboard or driver's side door"}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-white/80 text-sm mb-2">or</p>
            <Button
              onClick={() => {
                console.log("CTA button clicked - showing form");
                setShowForm(true);
              }}
              variant="outline"
              size="lg"
              className="h-14 px-10 text-lg bg-white/10 text-white border-white hover:bg-white/20"
            >
              Start Without VIN
            </Button>
          </div>

          <p className="text-white/80 mt-4 text-sm">
            ⚡ Takes less than 2 minutes
          </p>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center shadow-xl bg-white">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="font-bold text-lg mb-2">
              Same-Day Pickup Available
            </h3>
            <p className="text-gray-600 text-sm">
              We come to you within 24-48 hours
            </p>
          </Card>
          <Card className="p-6 text-center shadow-xl bg-white">
            <div className="text-4xl mb-3">💵</div>
            <h3 className="font-bold text-lg mb-2">Instant Cash Payment</h3>
            <p className="text-gray-600 text-sm">
              Get paid on the spot, guaranteed
            </p>
          </Card>
          <Card className="p-6 text-center shadow-xl bg-white">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-bold text-lg mb-2">100% Transparent Pricing</h3>
            <p className="text-gray-600 text-sm">No hidden fees or surprises</p>
          </Card>
        </div>
      </div>

      {/* Who We Help Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Perfect For Busy People & Quick Sales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">⏰</div>
              <div>
                <h3 className="font-bold text-xl mb-3">Need to Sell Quickly</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Moving or relocating soon</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Need cash for emergencies</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Don't have time for traditional sales</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🛡️</div>
              <div>
                <h3 className="font-bold text-xl mb-3">
                  Want a Safe, Hassle-Free Sale
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>No strangers at your home</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Avoid scams and payment issues</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>We handle all the paperwork</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🔧</div>
              <div>
                <h3 className="font-bold text-xl mb-3">
                  Damaged or Non-Running Vehicles
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Accident damage - we still want it</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Won't start or run - no problem</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>High mileage - we'll make an offer</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">🚗</div>
              <div>
                <h3 className="font-bold text-xl mb-3">
                  Older or High-Mileage Vehicles
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Limited private buyer interest</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>Not worth the hassle to sell privately</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-secondary mr-2">✓</span>
                    <span>We buy any year, any condition</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Get Your Cash in 3 Simple Steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-xl mb-3">Submit Vehicle Info</h3>
              <p className="text-gray-600">
                Enter your VIN and basic details. Takes less than 2 minutes.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-xl mb-3">Get Instant Offer</h3>
              <p className="text-gray-600">
                Receive a transparent cash offer immediately. No negotiations
                needed.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-xl mb-3">Get Paid & Picked Up</h3>
              <p className="text-gray-600">
                Accept the offer and we'll pick up your vehicle in 24-48 hours
                with cash in hand.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Turn Your Car Into Cash?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          No test drives. No haggling. No strangers. Just fast, fair cash.
        </p>
        <Button
          onClick={() => {
            console.log("Second CTA button clicked - showing form");
            setShowForm(true);
          }}
          size="lg"
          className="h-16 px-12 text-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-2xl"
        >
          Get My Cash Offer Now
        </Button>
        <div className="mt-6 flex items-center justify-center space-x-8 text-sm text-gray-500">
          <span className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            No obligation
          </span>
          <span className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            Free pickup
          </span>
          <span className="flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            Instant payment
          </span>
        </div>
      </div>

      {/* VIN Scanner Dialog */}
      <Dialog open={showVinScanner} onOpenChange={setShowVinScanner}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Scan Your VIN</DialogTitle>
          </DialogHeader>
          <VinScanner
            onVinDetected={(vin) => {
              setVinInput(vin);
              setShowVinScanner(false);
              // Auto-submit if VIN is 17 characters
              if (vin.length === 17) {
                setTimeout(() => setShowForm(true), 300);
              }
            }}
            onClose={() => setShowVinScanner(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/brand-avatar.png" 
              alt="TrackWala Brand Avatar" 
              className="w-12 h-12 rounded-full"
            />
            <span className="text-lg font-semibold">TrackWala</span>
          </div>
          <p className="text-sm text-gray-400">
            Fast, fair, and hassle-free vehicle buyouts
          </p>
        </div>
      </footer>
    </div>
  );
}
