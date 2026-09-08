from pathlib import Path
import sys
p=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/catalog/catalog_pipeline.py')
s=p.read_text()
start=s.index('def verify_home(supplier,u,s):')
end=s.index('\ndef brand_domain_candidates(',start)
s=s[:start]+'''def verify_home(supplier,u,s):
    try:r=get(s,u)
    except:return ''
    if r.status_code>=400 or 'html' not in r.headers.get('content-type','').lower():return ''
    d=domain(r.url);brand_name=clean(supplier.get('Supplier_Brand')).lower()
    if any(d==x or d.endswith('.'+x) for x in SEARCH_BLOCKED):return ''
    retailer_owners={'lowes.com':'lowe','homedepot.com':'home depot','acehardware.com':'ace hardware','ferguson.com':'ferguson','menards.com':'menards','grainger.com':'grainger','fastenal.com':'fastenal','amazon.com':'amazon'}
    for rd,owner in retailer_owners.items():
        if (d==rd or d.endswith('.'+rd)) and owner not in brand_name:return ''
    soup=BeautifulSoup(r.text[:2000000],'lxml');title=clean(soup.title.get_text(' ',strip=True) if soup.title else '').lower();body=clean(soup.get_text(' ',strip=True),30000).lower();tokens=key_tokens(supplier['Supplier_Brand'])
    if not tokens:return ''
    dc=d.replace('-','');domain_hits=sum(tok in dc for tok in tokens);title_hits=sum(tok in title for tok in tokens);body_hits=sum(tok in body[:6000] for tok in tokens)
    if len(tokens)==1:ok=domain_hits>=1 and (title_hits>=1 or body_hits>=1)
    else:ok=(domain_hits>=1 and title_hits+body_hits>=max(2,len(tokens)-1)) or title_hits==len(tokens)
    return norm(r.url) if ok else ''
'''+s[end:]
s=s.replace("    if time.monotonic()>=deadline:notes.append('site deadline reached during sitemap discovery')\n    return unique(products),sorted(seen),notes\n", "    complete=not q and len(seen)<MAX_MAPS and alln<MAX_DISCOVERED and time.monotonic()<deadline\n    if time.monotonic()>=deadline:notes.append('site deadline reached during sitemap discovery')\n    if len(seen)>=MAX_MAPS:notes.append('sitemap file cap reached')\n    if alln>=MAX_DISCOVERED:notes.append('discovered URL cap reached')\n    return unique(products),sorted(seen),notes,complete\n")
s=s.replace("rows=[];platforms=[];notes=[];unpriced=failed=attempted=0", "rows=[];platforms=[];notes=[];unpriced=failed=attempted=0;shop_status=woo_status='not_detected';maps_complete=False;used_fallback=False")
s=s.replace("x,status=shopify(sup,base,s,robots,deadline)\n        if x:rows+=x;platforms.append('Shopify')", "x,status=shopify(sup,base,s,robots,deadline);shop_status=status\n        if x:rows+=x;platforms.append('Shopify')")
s=s.replace("x,status=woocommerce(sup,base,s,robots,deadline)\n            if x:rows+=x;platforms.append('WooCommerce')", "x,status=woocommerce(sup,base,s,robots,deadline);woo_status=status\n            if x:rows+=x;platforms.append('WooCommerce')")
s=s.replace("if time.monotonic()<deadline:urls,maps,n=discover_maps(home_url,s,robots,deadline);notes+=n[:30]", "if time.monotonic()<deadline:urls,maps,n,maps_complete=discover_maps(home_url,s,robots,deadline);notes+=n[:30]")
s=s.replace("if not urls and time.monotonic()<deadline:urls=fallback(home_url,home.text[:8000000],s,robots,deadline)", "if not urls and time.monotonic()<deadline:urls=fallback(home_url,home.text[:8000000],s,robots,deadline);used_fallback=bool(urls)")
s=s.replace("    rows=dedupe(rows);complete=time.monotonic()<deadline and total<=MAX_PAGES and attempted>=len(urls);status=('COMPLETE_PUBLIC_PRICED_SNAPSHOT' if complete else 'PARTIAL_PUBLIC_PRICED_SNAPSHOT') if rows else ('PARTIAL_NO_QUALIFYING_PRICED_ROWS' if not complete else 'NO_PUBLIC_PRICED_PRODUCTS_FOUND')\n", "    rows=dedupe(rows);adapter_complete=(shop_status=='complete' and 'Shopify' in platforms) or (woo_status=='complete' and 'WooCommerce' in platforms);crawl_complete=maps_complete and not used_fallback and total<=MAX_PAGES and attempted>=len(urls) and time.monotonic()<deadline;complete=adapter_complete or crawl_complete;status=('COMPLETE_PUBLIC_PRICED_SNAPSHOT' if complete else 'PARTIAL_PUBLIC_PRICED_SNAPSHOT') if rows else ('NO_PUBLIC_PRICED_PRODUCTS_FOUND' if complete else 'PARTIAL_NO_QUALIFYING_PRICED_ROWS')\n")
start=s.index('def merge_status(paths,suppliers):')
end=s.index('\ndef copy_images(',start)
s=s[:start]+'''def merge_status(paths,suppliers):
    d={};rank={'COMPLETE_PUBLIC_PRICED_SNAPSHOT':9,'PARTIAL_PUBLIC_PRICED_SNAPSHOT':8,'NO_PUBLIC_PRICED_PRODUCTS_FOUND':7,'PARTIAL_NO_QUALIFYING_PRICED_ROWS':6,'HOMEPAGE_UNAVAILABLE_OR_BLOCKED':4,'NO_VERIFIED_DIRECT_WEBSITE':3,'COLLECTOR_EXCEPTION':2,'NOT_STARTED_SHARD_TIME_LIMIT':1,'MISSING_SHARD_STATUS':0}
    def score(r):
        try:products=int(r.get('priced_product_rows') or 0)
        except:products=0
        try:attempted=int(r.get('product_pages_attempted') or 0)
        except:attempted=0
        return (rank.get(r.get('collection_status'),0),products,attempted,r.get('completed_at_utc',''))
    for pth in paths:
        for raw in read_rows(pth):
            r={x:clean(raw.get(x,''),1000000) for x in STATUS_FIELDS};sid=r['supplier_id']
            if sid not in d or score(r)>score(d[sid]):d[sid]=r
    for sup in suppliers:
        if sup['Supplier_ID'] not in d:
            r={x:'' for x in STATUS_FIELDS};r.update({'supplier_id':sup['Supplier_ID'],'source_tier':sup['Source_Tier'],'supplier_name':sup['Supplier_Brand'],'collection_status':'MISSING_SHARD_STATUS','notes':'No shard status received.'});d[sup['Supplier_ID']]=r
    return sorted(d.values(),key=lambda r:r['supplier_id'])
'''+s[end:]
p.write_text(s)
print('runtime quality/status patch applied')
