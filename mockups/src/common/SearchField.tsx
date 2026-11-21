import { useEffect, useRef, useState } from 'react';
import { TextInput, type TextInputProps } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { Search } from 'lucide-react';

/** Czas od ostatniej litery do wysłania wyszukiwania. */
const SEARCH_DELAY_MS = 300;

/**
 * Wyszukiwarka nad listą: pisze się płynnie, a lista dostaje tekst dopiero po krótkiej przerwie (300 ms). Wartość
 * siedzi w adresie; zmiana z zewnątrz („Wyczyść”, przycisk wstecz) podmienia tekst w polu.
 *
 *   <SearchField label={t('search')} value={params.search} onChange={(search) => setParams({ search })} />
 */
export const SearchField = ({ label, value, onChange, w = { base: '100%', sm: 340 } }: {
  label: string;
  value: string;
  onChange: (search: string) => void;
  w?: TextInputProps['w'];
}) => {
  const [text, setText] = useState(value);
  // Ostatnie wyszukiwanie wysłane z tego pola; inna wartość z zewnątrz = zmiana spoza pola.
  const sent = useRef(value);
  const send = useDebouncedCallback((s: string) => {
    sent.current = s;
    onChange(s);
  }, SEARCH_DELAY_MS);
  useEffect(() => {
    // Adres przechowuje tekst bez spacji na brzegach: „Jan ” wysłane z pola wraca jako „Jan” i to nie jest zmiana z zewnątrz.
    if (value === sent.current.trim()) return;
    send.cancel();
    sent.current = value;
    setText(value);
  }, [value, send]);

  return (
    <TextInput
      placeholder={label}
      aria-label={label}
      leftSection={<Search size={16} />}
      value={text}
      onChange={(e) => {
        setText(e.currentTarget.value);
        send(e.currentTarget.value);
      }}
      w={w}
    />
  );
};
