/** An asynchronous result may navigate only while its original user choice is current. */
export class NavigationEpoch{private revision=0;advance(){return ++this.revision;}capture(){return this.revision;}current(ticket:number){return ticket===this.revision;}}
