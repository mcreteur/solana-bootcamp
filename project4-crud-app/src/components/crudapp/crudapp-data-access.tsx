"use client";

import { getCrudappProgram, getCrudappProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";

interface JournalEntry {
  title: string;
  message: string;
}

interface CreateJournalEntryArgs extends JournalEntry {
  owner: PublicKey;
}

interface UpdateJournalEntryArgs extends CreateJournalEntryArgs {}

export function useCrudappProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();

  const programId = useMemo(
    () => getCrudappProgramId(cluster.network as Cluster),
    [cluster]
  );
  const program = useMemo(
    () => getCrudappProgram(provider, programId),
    [provider, programId]
  );

  const accounts = useQuery({
    queryKey: ["crudapp", "all", { cluster }],
    queryFn: () => program.account.journalEntryState.all(),
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const createJournalEntry = useMutation<string, Error, CreateJournalEntryArgs>(
    {
      mutationKey: ["journalEntry", "create", { cluster }],
      mutationFn: async ({ title, message, owner }) => {
        const [journalEntryAddress] = PublicKey.findProgramAddressSync(
          [Buffer.from(title), owner.toBuffer()],
          programId
        );

        return program.methods.createJournalEntry(title, message).rpc();
      },
      onSuccess: (signature) => {
        transactionToast(signature);
        accounts.refetch();
      },
      onError: (error) => {
        return toast.error(`Failed to create journal entry: ${error}`);
      },
    }
  );

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createJournalEntry,
  };
}

export function useCrudappProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program, accounts } = useCrudappProgram();
  const programId = new PublicKey(
    "EswGRpQv4MS8E3kdP78sG5SxYXsE3PYYe7uuWJVgQW8v"
  );

  const accountQuery = useQuery({
    queryKey: ["crudapp", "fetch", { cluster, account }],
    queryFn: () => program.account.journalEntryState.fetch(account),
  });

  const updateJournalEntry = useMutation<string, Error, UpdateJournalEntryArgs>(
    {
      mutationKey: ["journalEntry", "update", { cluster }],
      mutationFn: async ({ title, message, owner }) => {
        const [journalEntryAddress] = PublicKey.findProgramAddressSync(
          [Buffer.from(title), owner.toBuffer()],
          programId
        );
        return program.methods.updateJournalEntry(title, message).rpc();
      },
      onSuccess: (signature) => {
        transactionToast(signature);
        accounts.refetch();
      },
      onError: (error) =>
        toast.error(`Failed to update journal entry: ${error}`),
    }
  );

  const deleteJournalEntry = useMutation<string, Error, { title: string }>({
    mutationKey: ["journalEntry", "delete", { cluster }],
    mutationFn: ({ title }) => program.methods.deleteJournalEntry(title).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
    },
    onError: (error) => toast.error(`Failed to delete journal entry: ${error}`),
  });

  return {
    accountQuery,
    updateJournalEntry,
    deleteJournalEntry,
  };
}
