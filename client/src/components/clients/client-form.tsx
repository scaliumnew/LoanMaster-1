import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertClientSchema } from "@shared/schema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Extend the schema with additional validation
const clientFormSchema = insertClientSchema.extend({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultValues?: Partial<ClientFormValues>;
  isEditing?: boolean;
  clientId?: number;
}

export function ClientForm({
  isOpen,
  onClose,
  onSuccess,
  defaultValues = {
    name: "",
    phone: "",
    email: "",
    address: "",
  },
  isEditing = false,
  clientId,
}: ClientFormProps) {
  const { toast } = useToast();
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  });
  
  const { isSubmitting } = form.formState;

  async function onSubmit(data: ClientFormValues) {
    try {
      if (isEditing && clientId) {
        await apiRequest("PATCH", `/api/clients/${clientId}`, data);
        toast({
          title: "Client updated",
          description: "The client has been successfully updated.",
        });
      } else {
        await apiRequest("POST", "/api/clients", data);
        toast({
          title: "Client created",
          description: "The client has been successfully created.",
        });
      }
      
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to save client. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter client's address" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update Client" : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
